# Local-first sync

Each household's recipes, tags, favorites, and meal plan live in a [LiveStore](https://livestore.dev/) store. Every browser keeps a full copy in SQLite and syncs changes with the household's Durable Object in the background. Pages read from the local copy, so queries and writes are instant.

The goal is speed, not offline use, in the spirit of Rocicorp's Zero: the app expects a connection, and writes reach the server within moments. Don't build offline-only flows or design around long periods without sync.

Users, households, members, invites, and in-progress imports are not synced. They live in D1 and are read through the API.

## How it fits together

```
Browser tab ─┐
Browser tab ─┼─ SharedWorker ─ LiveStore worker (SQLite in OPFS) ── WebSocket /api/sync ── SyncBackendDO (one per household)
Browser tab ─┘
```

- **Client:** `src/client/lib/livestore/` sets up a persisted web adapter. A SharedWorker coordinates tabs, and a dedicated worker holds SQLite in OPFS and syncs over a WebSocket.
- **Server:** `/api/sync` checks access, then hands the socket to `SyncBackendDO` (`src/server/sync.ts`), which stores the household's event log in Durable Object SQLite.
- **Store ID:** `householdStoreId` in `@shared/household` maps a household to its store: `household-v<SYNC_HISTORY_VERSION>-<householdId>`.

## Events are the data

A store holds an ordered log of events, such as `v1.RecipeCreated` and `v1.MealPlanned`. Tables like `recipes` and `planned_meals` are built from that log by materializers. Only the events sync; every client rebuilds its tables locally.

- Events and tables are defined in `src/shared/recipes.ts` and `src/shared/meal-plan.ts`, shared by the client worker and the server.
- Tables and materializers can change freely. LiveStore rebuilds the tables from the events when the state schema changes.
- Events are the contract. A change to an event's shape has to keep every event already in the log replayable. See [Changing events](#changing-events).

Browsers write every event, including the results of server work. A finished import is saved as a recipe by the browser that started it, and a recipe's AI profile is saved as a `v1.RecipeProfiled` event by the browser that asked for it. The server never writes to the event log.

## Opening the store

The app layout (`routes/_authenticated/_app/_layout.tsx`) opens the household store and keeps it open for as long as the app is mounted. Keep these properties when changing how the store loads:

- The shell renders right away from the cached session. Only page content waits, and only the first time the store opens.
- The store opens from the local copy first. Initial sync is skipped (`initialSyncOptions: Skip`), so pulling new events never blocks a page.
- `householdStoreReady()` suspends until the store is open and returns the same promise on every call. A failed open is retried on the next render.
- Use `getOrLoadPromise()` when code must wait for the store. `preload()` is best-effort and hides failures.

## Access

- **On connect:** `/api/sync` checks the session cookie against D1, skipping the cookie cache, and checks that the user belongs to the store's household.
- **While connected:** a Durable Object alarm runs the same check every 15 minutes and closes sockets whose session expired or whose user left the household. A removed member can receive updates until the next check.
- **On sign-out or removal:** the client disposes the store and calls `/api/local-data/clear`, which responds with `Clear-Site-Data: "storage"` to delete the local copy. See [Auth and households](./auth-and-households.md).

## Changing events

**Before launch**, production holds no data worth keeping, so events can change freely. When a change breaks replay of existing events, bump `SYNC_HISTORY_VERSION` in `@shared/household`. Every household then starts on a new, empty store, and the old one is left unused. D1 data (users, households, invites) is kept.

**After launch**, published events are permanent, because every synced event is replayed with the current code:

- Adding an optional field is fine if the materializer gives older events a default.
- Making a required field optional is fine.
- Anything else (a new required field, a rename, a removal, a new type) needs a new event version, such as `v2.RecipeCreated`. Keep the old definition and its materializer.
- Never bump `SYNC_HISTORY_VERSION` once real data exists.

## Local development

`bun run dev` keeps the Durable Object's state in `.cloudflare/state/v3/do`. `bun run db:seed` replaces your household's local event log with sample recipes and a month of meals. Open tabs notice the change, clear their copy, and sync the samples on reload.

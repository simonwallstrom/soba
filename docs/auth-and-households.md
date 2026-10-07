# Auth and households

Everyone signs in with Google through [Better Auth](https://www.better-auth.com/). Each user belongs to at most one household, which shares one recipe collection and meal plan. Users, sessions, households, members, and invites live in D1 (`src/server/db/schema.ts`).

## Who can sign up

Soba is invite-only. A new Google account can sign up when either:

- its email is listed in `AUTH_ALLOWED_EMAILS`, or
- it signs in from an invite link with a valid token.

The invite page passes its token through Google sign-in as OAuth state. A database hook (`assertCanSignUp` in `src/server/auth/auth.ts`) checks it before the user row is created. Anyone else gets a "not invited" error.

Only allowlisted users can create a household. Everyone else joins one through an invite.

## Households

- **Roles:** the creator is the `owner`, and everyone who joins is a `member`. A household holds at most 20 members.
- **Invites:** each household has one invite link. Only the owner can reset it, and resetting replaces the token, so the old link stops working.
- **Leaving:** a member can leave at any time. The owner can't be removed and can leave only by deleting the household once nobody else is in it.
- **Settings:** language and units, used to translate and convert imported recipes. A new household's defaults come from the browser's locale.

Routes are in `src/server/household/routes.ts` and queries in `src/server/household/household.ts`.

## Sessions on the server

- Sessions last 30 days and refresh daily.
- A signed cookie cache holds session data for 5 minutes, so most requests skip D1.
- `requireSession` and `requireHousehold` middleware authorize API routes. Every protected request is checked on the server; the client's session is only a UI cache.
- Sync connections skip the cookie cache and check D1 directly, because a socket can outlive the cache. See [Local-first sync](./local-first-sync.md#access).
- `/api/*` rejects cross-origin requests (CSRF), and auth and invite routes are rate-limited by IP.

## Sessions on the client

The client reads `/api/me` through a shared TanStack Query cache (`src/client/lib/session.ts`):

- **Instant start:** the last signed-in session is saved to `localStorage`. On load it is shown immediately and revalidated in the background, so the app renders before the server answers.
- **Blocking only once:** the `/_authenticated` route waits for the session only on a first visit with nothing cached.
- **Revalidation:** the session goes stale after a minute and refetches on window focus, on reconnect, and every 5 minutes.
- **After changes:** call `invalidateSession()` after creating, joining, or leaving a household, or removing a member. It refetches and tells other tabs over a `BroadcastChannel`.

## Losing access

When the session changes to another user or household, or to none, the client clears everything local before moving on:

- **Sign-out:** signs out with Better Auth, disposes the household store, clears local storage through `/api/local-data/clear`, and tells other tabs, which do the same.
- **Removed from a household:** the next session check notices the household is gone. `/_authenticated` resets local data and sends the user to onboarding.

Keep this teardown intact when changing auth or household flows: a stale local copy would show a household's recipes to someone no longer in it.

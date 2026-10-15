# Household data

Each household's recipes, tags, favorites, recipe profiles, and meal plan live in D1, beside users and households (`src/server/db/schema.ts`). Every client reads and writes them through the same API, so the web app, and later an iOS app or MCP tools, share one set of endpoints.

The goal is still speed, not offline use: the app keeps the household's data in memory, reads from that copy, and shows a change before the server has answered. It expects a connection. Don't build offline-only flows.

## The API

| Route                                       | What it does                                                       |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `GET /api/recipes`                          | Recipes with tag IDs and profiles, the tags, and your favorite IDs |
| `POST /api/recipes`, `PUT /api/recipes/:id` | Save a recipe, with any new tags it uses. The last save wins       |
| `DELETE /api/recipes/:id`                   | Delete a recipe, with its favorites, profile, and planned meals    |
| `PUT`/`DELETE /api/recipes/:id/favorite`    | Favorite or unfavorite it, for the signed-in member                |
| `POST /api/tags`, `PUT /api/tags/:id`       | Add or rename a tag. A name another tag has, in any case, is a 409 |
| `POST /api/tags/:id/merge`                  | Move a tag's recipes to another tag (`into`) and delete it         |
| `DELETE /api/tags/:id`                      | Delete a tag and take it off its recipes                           |
| `GET /api/meal-plan`                        | Every planned dinner                                               |
| `PUT /api/meal-plan`                        | Plan dinners for up to 14 days, replacing any already there        |
| `POST /api/meal-plan/remove`, `/move`       | Clear days, or move a meal to another day, swapping if it is taken |

Routes are in `src/server/recipes/`, `src/server/tags/`, and `src/server/meal-plan/`. Every member can manage tags, from Settings. Keep these properties when changing them:

- **Scoped to the household:** `requireSession` and `requireHousehold` run on every request, and every query filters by the member's household. A recipe ID from another household is a 404.
- **IDs come from the client:** the app makes recipe and tag IDs, so a new recipe's page can open before the server answers.
- **One round trip:** `GET /api/recipes` and writes that touch several tables use `db.batch`, which D1 runs as one transaction. D1 allows 100 bound values per statement, which is why tag and day counts are capped.

## Reading and changing data in the app

`createHouseholdData` (`src/client/features/household/data.ts`) wraps one TanStack Query fetch. There are two: `recipeData` (`features/recipes/recipe-data.ts`) and `mealPlanData` (`features/meal-plan/meal-plan-data.ts`).

- **Reads** use `useData()`, which suspends until the first fetch. The app layout starts both fetches as it mounts, and pages filter, sort, and search in memory.
- **Between visits**, the server's last copy of each is kept in `localStorage` (`soba-recipes`, `soba-meal-plan`), so the app opens with it and fetches behind it. A copy only shows to the member and household it was saved for, and one that no longer matches its schema is dropped. Unsaved changes are never stored. The household's members are kept the same way (`soba-members`), so author names show at once.
- **Loading and errors:** only a first visit waits, with "Loading…" in the page area. If that first fetch fails, the app layout's error screen offers to try again. With a stored copy, a failed fetch changes nothing.
- **Photos** live in R2 under the household's prefix. The server removes a recipe's uploaded photo when the recipe is deleted or its photo is replaced or removed. A photo uploaded for a recipe that is never saved is left behind.
- **Changes** go through `save(update, send)`. `update` is applied on top of the cached server copy right away, and `send` goes to the server. Sends run one at a time, in order, so a quick undo never overtakes the change it takes back.
- **After saving,** the data is fetched again, and a change stops being applied once a fetch that began after it was saved comes back. A fetch can bring a change back while it still shows, so write `update` to give the same result then: set values rather than toggling or appending.
- **A failed save** removes the change and shows a toast. The cached copy was never edited, so nothing needs rolling back.
- **Other members' changes** arrive when the data is refetched: after your own change, when the app regains focus, or on the next visit. Nothing is pushed.

How the recipe list is shown (view, sort, visible details) is saved per device in `localStorage` (`features/recipes/list-settings.ts`), not on the server.

## Tests and local data

`scripts/testing/memory-database.ts` builds an in-memory SQLite database from the migrations and hands it to Drizzle as D1, so route tests run the real queries (`src/server/recipes/routes.test.ts`).

`bun run db:seed` replaces your household's local recipes, tags, and meal plan with the samples. Stop `bun run dev` first.

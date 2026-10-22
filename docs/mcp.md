# MCP

Soba is an MCP server, so Claude and other MCP clients can work with a household's recipes and meal plan. The server is `/mcp` on the same Worker as the app. The plan is in [issue #2](https://github.com/simonwallstrom/soba/issues/2).

## Tools

All scoped to the member's household:

| Tool             | What it does                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `get_household`  | Name, members, language and units, recipe count, and tags with their recipe counts            |
| `search_recipes` | Recipes matching words or a tag, or all of them; with `full`, their whole text too            |
| `get_recipe`     | One recipe in full, with who added it                                                         |
| `get_meal_plan`  | Planned dinners between two dates, past ones included; the last 8 weeks and next 2 by default |
| `create_recipe`  | Saves a new recipe, such as one Claude read from a link or photos                             |
| `update_recipe`  | Changes only the fields given                                                                 |
| `delete_recipe`  | Moves a recipe to Recently deleted, hiding its planned days, as the app does                  |
| `plan_meals`     | Plans dinners on up to 14 days, replacing what's there, and says what it replaced             |
| `clear_days`     | Removes the dinners on up to 14 days                                                          |
| `create_tag`     | Adds a tag, when the member wants one                                                         |
| `rename_tag`     | Renames a tag on every recipe                                                                 |
| `merge_tags`     | Moves a tag's recipes to another tag and deletes it                                           |
| `delete_tag`     | Deletes a tag; its recipes stay                                                               |

Search is how Claude reads in bulk: by default results are compact, and with `full` they carry each recipe's description, ingredients, and steps, up to 50 at a time, so Claude can read a week's candidates in one call. Search results say when each recipe was last eaten and when it's next planned, and the meal plan says who planned each day, so Claude can plan around the household's habits. Results link to the app, and search ignores case and accents.

The server's instructions name the household and the language and units its recipes are written in. An **Import recipe** prompt (`import_recipe`) asks Claude to save a recipe from a link or attached photos.

### Writing recipes

Members import recipes with their own Claude rather than through Soba's import: Claude reads the page or photos and calls `create_recipe`. Its description carries the same writing rules as the import model's prompt (`recipeWritingRules` in `src/server/recipe-import/extract.ts`), for the household's language and units, so recipes read the same either way.

- **Limits** are the recipe form's own, like a 60-character title, and are errors Claude can fix and retry, never silent clipping.
- **Tags:** recipes get only the household's existing tags, matched by name. Names it doesn't have are left out and listed in the answer. `create_tag` adds one when the member wants it, so an import never invents tags. The tag tools take names, as Claude sees them in `get_household`, and use the same functions as Settings.
- **Duplicates:** a recipe already saved from the same `sourceUrl` is refused unless Claude passes `allowDuplicate`.
- **Photos:** a tool call's arguments are JSON the model writes, so a photo the member attached in Claude can't reach a tool. `imageUrl` takes a photo on the web instead, such as the page's main image, and Soba downloads it into the household's photos (`downloadPhoto`, shared with link imports), so recipes never depend on another site. When the download fails the recipe saves without it, or keeps its photo, and the answer says why. Replacing or clearing an uploaded photo deletes it from the bucket, as the app does. `get_recipe` only says whether there is a photo, since photo URLs need a member's session.
- **The meal plan:** days before today can't change. Meals Claude plans count as the member's own.
- **Annotations:** every tool that changes or removes data is marked destructive, so clients may ask before running it; only `create_recipe` and `create_tag` aren't. A recipe page could ask Claude to delete things, so `delete_recipe`'s description tells Claude to delete only when the member asks, after confirming the title.
- The open app shows changes when it next refetches, such as when it regains focus.

## Connecting

MCP clients find everything through OAuth discovery, starting from `/mcp`'s 401:

1. **Discovery:** the 401's `WWW-Authenticate` header points to `/.well-known/oauth-protected-resource/mcp`, which names the authorization server, `/api/auth`. Its metadata is at `/.well-known/oauth-authorization-server/api/auth`.
2. **Registration:** the client registers itself at `/api/auth/oauth2/register`, unauthenticated, as Claude does.
3. **Login:** the authorize endpoint sends a logged-out member to the start page with a signed request in the URL. The auth client's OAuth plugin (`src/client/lib/auth.ts`) passes it through Google login, and the server continues to consent afterwards. The Worker skips its `/` → `/recipes` redirect when the URL has a `sig`.
4. **Consent:** `/oauth/consent` names the app and the host it returns to, since any app can register under any name. A member answers once per app; later logins skip the page.
5. **Tokens:** the client gets a 1-hour JWT access token for `/mcp` and a 30-day refresh token.

## AI assistants in Settings

Settings has an "AI assistants" group (`#assistants`, also in the account menu) for the member's own connected apps, from `/api/connections` (`src/server/mcp/connections.ts`). With none it shows the connector URL and how to add it; with some it lists them, and "Connect another" shows the URL again. It's named for assistants in general, since any MCP client can connect, not only Claude.

- **Connected apps** are the member's OAuth consents, with the app's name, the host it returns to, and roughly when it was last used: the newest refresh token, since an app refreshes when it's used after its hour is up.
- **Disconnecting** deletes the consent and every access and refresh token the app holds for the member. Better Auth's own `delete-consent` endpoint leaves the tokens, so it isn't used.
- **At once:** access tokens are JWTs checked without the database, so `requireMcpToken` also refuses a token whose app (its `azp` claim) no longer has the member's consent.

## How it's built

- **The MCP server** (`src/server/mcp/server.ts`) uses the official SDK's `createMcpHandler`, which builds a server for each request, for the token's member, and keeps no sessions. Tool input schemas are Valibot, converted with `toStandardJsonSchema`. JSON Schema can't express regex flags, so dates use `v.isoDate()` rather than `mealDatePattern`.
- **Tool answers** (`src/server/mcp/read-tools.ts`) reuse the API's queries, like `listRecipes` and `listMeals`, and are plain JSON with names rather than member IDs. "Today", for the default meal plan range, what counts as eaten, and which days can change, is the date in the household's time zone.
- **Rate limit:** 120 requests a minute per member (`MCP_RATE_LIMITER`). It's keyed by member rather than IP, because every claude.ai user calls from Claude's servers.
- **Better Auth's `mcp()` plugin** (`@better-auth/mcp`) is the OAuth provider, configured in `src/server/auth/auth.ts` beside the `jwt()` plugin that signs tokens. Its tables are in `src/server/db/schema.ts`. Members can't create or edit OAuth apps by hand; only registration creates them.
- **`requireMcpToken`** (`src/server/mcp/auth.ts`) checks the token's signature, issuer, audience, and expiry with the auth instance's keys, in the Worker rather than over HTTP. It then looks up the member's household on every request, so a member who leaves stops reaching it at once. Tokens bound to a DPoP key are refused.
- **CSRF:** clients call the register, token, revoke, and introspect endpoints from their own servers, so `src/server/index.ts` skips the origin check for those paths. They authenticate the client and code, never a cookie.
- **Worker routes:** `/.well-known/*` and `/mcp` run the Worker first (`cloudflare.config.ts`).

## Local development

`BETTER_AUTH_URL` decides the issuer and the resource, so connect clients to `http://localhost:5173/mcp`. The OAuth plugin only allows HTTP on localhost. In Claude Code:

```sh
claude mcp add --transport http soba-local http://localhost:5173/mcp
```

Then run `/mcp` in Claude Code to log in. The route tests (`src/server/mcp/routes.test.ts`) call the tools over JSON-RPC with signed test tokens.

# MCP

Soba is an MCP server, so Claude and other MCP clients can work with a household's recipes and meal plan. The server is `/mcp` on the same Worker as the app. The plan, including the write tools still to come, is in [issue #2](https://github.com/simonwallstrom/soba/issues/2).

## Tools

All read-only so far, and all scoped to the member's household:

| Tool             | What it answers                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `get_household`  | Name, members, language and units, recipe count, and every tag                                                 |
| `search_recipes` | Recipes matching words in the title, description, ingredients, or tags, or one tag; all of them without either |
| `get_recipe`     | One recipe in full, with who added it                                                                          |
| `get_meal_plan`  | Planned dinners between two dates, past ones included; the last 8 weeks and next 2 by default                  |

Search results say when each recipe was last eaten and when it's next planned, and the meal plan says who planned each day, so Claude can plan around the household's habits. Results link to the app, and search ignores case and accents.

The server's instructions name the household and the language and units its recipes are written in.

## Connecting

MCP clients find everything through OAuth discovery, starting from `/mcp`'s 401:

1. **Discovery:** the 401's `WWW-Authenticate` header points to `/.well-known/oauth-protected-resource/mcp`, which names the authorization server, `/api/auth`. Its metadata is at `/.well-known/oauth-authorization-server/api/auth`.
2. **Registration:** the client registers itself at `/api/auth/oauth2/register`, unauthenticated, as Claude does.
3. **Login:** the authorize endpoint sends a logged-out member to the start page with a signed request in the URL. The auth client's OAuth plugin (`src/client/lib/auth.ts`) passes it through Google login, and the server continues to consent afterwards. The Worker skips its `/` → `/recipes` redirect when the URL has a `sig`.
4. **Consent:** `/oauth/consent` names the app and the host it returns to, since any app can register under any name. A member answers once per app; later logins skip the page.
5. **Tokens:** the client gets a 1-hour JWT access token for `/mcp` and a 30-day refresh token.

## How it's built

- **The MCP server** (`src/server/mcp/server.ts`) uses the official SDK's `createMcpHandler`, which builds a server for each request, for the token's member, and keeps no sessions. Tool input schemas are Valibot, converted with `toStandardJsonSchema`. JSON Schema can't express regex flags, so dates use `v.isoDate()` rather than `mealDatePattern`.
- **Tool answers** (`src/server/mcp/read-tools.ts`) reuse the API's queries, like `listRecipes` and `listMeals`, and are plain JSON with names rather than member IDs. "Today", for the default meal plan range and what counts as eaten, is the UTC date.
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

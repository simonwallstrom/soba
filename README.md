# Soba

Recipe organizer for families. A React SPA with local-first sync, served by a Cloudflare Worker and configured in `cloudflare.config.ts` with the [cf CLI](https://github.com/cloudflare/cf) (beta).

## Prerequisites

- [Bun](https://bun.sh/) 1.4.2, the version in `packageManager`
- A Google OAuth web client with `http://localhost:5173/api/auth/callback/google` as an authorized redirect URI
- A Cloudflare account with an AI Gateway, for recipe imports and profiles. Workers AI runs remotely in local dev, so log in with the cf CLI first.

## Get started

```sh
bun install --frozen-lockfile
bun run hooks:install
cp .dev.vars.example .dev.vars
bun run db:migrate:local
bun run dev
```

Fill in `.dev.vars` before starting: Google OAuth credentials, a random `BETTER_AUTH_SECRET`, your Google email in `AUTH_ALLOWED_EMAILS`, and the AI Gateway URL and token. The app runs at `http://localhost:5173/`.

`hooks:install` sets up a pre-commit hook that formats, lints, and typechecks staged changes.

### Resetting the database

Until launch, schema changes replace `drizzle/migrations/0000_*.sql` instead of adding migrations. Delete `.cloudflare/state/v3/d1` and `.cloudflare/state/v3/do`, run `bun run db:generate` and `bun run db:migrate:local`, then clear the site data in your browser.

## Commands

| Command                     | Description                                                  |
| --------------------------- | ------------------------------------------------------------ |
| `bun run dev`               | Start the app and Worker API locally                         |
| `bun run check`             | Check formatting, lint, TypeScript, and tests                |
| `bun run test`              | Run tests                                                    |
| `bun run build`             | Check and build for production                               |
| `bun run preview`           | Preview the production build                                 |
| `bun run deploy`            | Build, apply remote migrations, and deploy to Cloudflare     |
| `bun run format`            | Format with Oxfmt                                            |
| `bun run db:generate`       | Generate D1 migration SQL after changing the database schema |
| `bun run db:migrate:local`  | Apply D1 migrations locally                                  |
| `bun run db:migrate:remote` | Apply D1 migrations to the deployed database                 |
| `bun run db:seed`           | Reset local recipes, tags, and meal plan to the samples      |
| `bun run import:compare`    | Compare models on recipe import sources                      |

## Deploy

Cloudflare Workers Builds deploys every push to `main` with `bun run deploy`. That command runs the checks, builds, applies pending D1 migrations, and then deploys the Worker.

Setup, one time:

1. Create a D1 database named `soba-db` and add its ID to `cloudflare.config.ts` and the `db:migrate` scripts.
2. Connect the repository to the `soba` Worker under Workers Builds. Set the deploy command to `bun run deploy`, and set the build variable `BUN_VERSION` to the version in `packageManager`.
3. Add the `.dev.vars.example` values as Worker secrets, with `BETTER_AUTH_URL` set to the deployed origin.
4. Add `<origin>/api/auth/callback/google` as a redirect URI on the Google OAuth client.

## Tech stack

- **App:** React, TanStack Router and Query, Tailwind CSS, LiveStore
- **API:** Hono RPC, Better Auth with Google, Valibot
- **Platform:** Vite, Cloudflare Workers, D1, Durable Objects, Workflows
- **AI:** Claude Sonnet and Workers AI's Clef, through AI Gateway
- **Tooling:** Bun, TypeScript, Oxlint, Oxfmt, Lefthook, React Compiler

## Docs

- [Local-first sync](./docs/local-first-sync.md): how household data syncs, and the rules for changing events
- [Auth and households](./docs/auth-and-households.md): sign-up, invites, roles, and the client session cache
- [AI and meal planning](./docs/ai-and-meal-planning.md): how recipes are imported and profiled, and how meal suggestions are scored
- [Conventions](./docs/conventions.md): code organization, routes, and tooling

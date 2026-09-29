# Soba

Recipe organiser for families. A React SPA with local-first sync, served by a Cloudflare Worker.

## Prerequisites

- [Bun](https://bun.sh/) 1.4.2, the version in `packageManager`
- A Google OAuth web client with `http://localhost:5173/api/auth/callback/google` as an authorized redirect URI

## Get started

```sh
bun install --frozen-lockfile
bun run hooks:install
cp .dev.vars.example .dev.vars
bun run db:migrate:local
bun run dev
```

Fill in `.dev.vars` before starting: Google OAuth credentials, a random `BETTER_AUTH_SECRET`, and your Google email in `AUTH_ALLOWED_EMAILS`. The app runs at `http://localhost:5173/`.

`hooks:install` sets up a pre-commit hook that formats, lints, and typechecks staged changes.

### Resetting the database

Until launch, schema changes replace `drizzle/migrations/0000_*.sql` instead of adding migrations. Delete `.wrangler/state/v3/d1` and `.wrangler/state/v3/do`, run `bun run db:generate` and `bun run db:migrate:local`, then clear the site data in your browser.

## Commands

| Command                     | Description                                                  |
| --------------------------- | ------------------------------------------------------------ |
| `bun run dev`               | Start the app and Worker API locally                         |
| `bun run check`             | Check formatting, lint, Worker types, TypeScript, and tests  |
| `bun run test`              | Run tests                                                    |
| `bun run build`             | Check and build for production                               |
| `bun run preview`           | Preview the production build                                 |
| `bun run deploy`            | Build, apply remote migrations, and deploy to Cloudflare     |
| `bun run format`            | Format with Oxfmt                                            |
| `bun run types:worker`      | Regenerate Worker types after changing `wrangler.jsonc`      |
| `bun run db:generate`       | Generate D1 migration SQL after changing the database schema |
| `bun run db:migrate:local`  | Apply D1 migrations locally                                  |
| `bun run db:migrate:remote` | Apply D1 migrations to the deployed database                 |

## Deploy

Cloudflare Workers Builds deploys every push to `main` with `bun run deploy`. That command runs the checks, builds, applies pending D1 migrations, and then deploys the Worker.

Setup, one time:

1. Create a D1 database named `soba-db` and add its `database_id` to `wrangler.jsonc`.
2. Connect the repository to the `soba` Worker under Workers Builds. Set the deploy command to `bun run deploy`, and set the build variable `BUN_VERSION` to the version in `packageManager`.
3. Add the `.dev.vars.example` values as Worker secrets, with `BETTER_AUTH_URL` set to the deployed origin.
4. Add `<origin>/api/auth/callback/google` as a redirect URI on the Google OAuth client.

## Tech stack

- **App:** React, TanStack Router and Query, Tailwind CSS, LiveStore
- **API:** Hono RPC, Better Auth with Google, Valibot
- **Platform:** Vite, Cloudflare Workers, D1, Durable Objects
- **Tooling:** Bun, TypeScript, Oxlint, Oxfmt, Lefthook, React Compiler

See [AGENTS.md](./AGENTS.md) for code conventions.

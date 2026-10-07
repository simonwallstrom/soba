# Agent guidelines

Soba is a recipe organizer for families: a React SPA with local-first sync, served by a Cloudflare Worker. See the [README](./README.md) for setup and commands.

- Use Bun. Run `bun run check` after changes, and `bun run build` when routing, Vite, Worker, or build behavior changes.
- Follow [docs/conventions.md](./docs/conventions.md) for all code.
- Local-first is for speed, not offline use: reads and writes should feel instant, and a connection is required. Don't add offline-only flows.
- Soba is pre-launch, with no users or data worth keeping. Resetting local or production data is fine.

Read the matching doc before changing these areas:

- Synced data, LiveStore events, or the household store: [docs/local-first-sync.md](./docs/local-first-sync.md)
- Auth, sessions, households, or invites: [docs/auth-and-households.md](./docs/auth-and-households.md)
- Recipe imports, profiles, or meal suggestions: [docs/ai-and-meal-planning.md](./docs/ai-and-meal-planning.md)

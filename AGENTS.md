# Agent guidelines

Soba is a recipe organizer for families: a React SPA served by a Cloudflare Worker, with its data in D1. See the [README](./README.md) for setup and commands.

- Use Bun. Run `bun run check` after changes, and `bun run build` when routing, Vite, Worker, or build behavior changes.
- Follow [docs/conventions.md](./docs/conventions.md) for all code.
- Reads and writes should feel instant: the app reads from its in-memory copy and shows changes before the server answers. A connection is required. Don't add offline-only flows.
- Soba is pre-launch, with no users or data worth keeping. Resetting local or production data is fine.

Read the matching doc before changing these areas:

- Recipes, tags, favorites, the meal plan, or how the app reads and saves them: [docs/data.md](./docs/data.md)
- Auth, sessions, households, or invites: [docs/auth-and-households.md](./docs/auth-and-households.md)
- Recipe imports, profiles, or meal suggestions: [docs/ai-and-meal-planning.md](./docs/ai-and-meal-planning.md)

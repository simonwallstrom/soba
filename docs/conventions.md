# Conventions

## Routes and UI

- Pages own React 19 `<title>` tags, placed first in their JSX. Use `formatMetaTitle` from `@client/lib/meta` for `Page · Soba`; the landing page uses `Soba · Recipe organizer for families`. Give loading, error, and not-found screens titles too. Layouts and `index.html` must not add competing document titles.
- Name directory layout routes `_layout.tsx` (configured with TanStack Router’s `routeToken`). Keep `__root.tsx` for the root route and use `_`-prefixed folders for pathless layouts.
- Keep route-specific UI, types, and behavior in `src/client/routes/`. Inline one-off markup in the route component so the page composition stays readable.
- Extract a component when it is reused, owns meaningful behavior or state, or clarifies a repeated pattern. Keep route-local components beside the route in a dash-prefixed file or folder that TanStack Router ignores.
- The route controls layout and spacing between sections. A child controls spacing inside itself. Prefer `flex` or `grid` with `gap-*` for siblings.
- Follow the nearest route's pattern before introducing an abstraction. Use function declarations for named components.

## Code organization

- Routes own navigation, loaders, guards, and page composition. Do not import a route's dash-prefixed files from another route; move genuinely reused code first.
- Put reusable product-domain code in `src/client/features/<domain>/`: domain UI, hooks, queries, mutations, and types used across routes. Keep one-route workflows beside their route.
- Put domain-agnostic primitives in `src/client/components/ui/`, generic composed UI in `src/client/components/particles/`, and infrastructure or true utilities in `src/client/lib/`. Do not put product-domain code in `lib/`.
- Imports should flow from routes to features, and from features to generic components or `lib/`. Features and generic modules must not import routes; prefer route composition over feature-to-feature coupling.
- Keep Worker code in `src/server/`; Worker bindings and exports come from `cloudflare.config.ts`. Use `src/shared/` only for code shared across runtimes. Create these folders when their first real module needs them.

## Code and tooling

- Write American English in UI text, comments, and docs ("color", "favorite", "organizer").
- Use strict TypeScript, `import type` for type-only imports, and direct imports instead of barrels. Keep the client's Hono `AppType` import type-only.
- Use `@client/*`, `@server/*`, and `@shared/*` aliases. Validate data at network boundaries.
- Use Tailwind utilities and let Oxfmt sort imports and classes. Do not hand-format against it.
- Colocate tests as `*.test.ts` beside the module they cover. `tsconfig.node.json` typechecks them with Bun's types, alongside the Vite and Drizzle configs. `bun run test` isolates each file, so module mocks and module-level state never leak between files.
- Worker config lives in `cloudflare.config.ts`; `bun run typecheck` regenerates the gitignored `.cloudflare/types` from it.
- Keep dependency versions exact in `package.json`.

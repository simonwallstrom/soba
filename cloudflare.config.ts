import { bindings, defineConfig, exports, triggers } from "cf/config";

export default defineConfig({
  worker: {
    name: "soba",
    compatibilityDate: "2026-09-24",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "./src/server/index.ts",
    domains: ["soba.family"],
    workersDev: false,
    previewUrls: false,
    observability: { enabled: true },
    // Deletes for good the recipes in Recently deleted for 30 days. See purgeDeletedRecipes.
    triggers: [triggers.scheduled({ schedule: "0 3 * * *" })],
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/", "/r/*", "/api/*", "/.well-known/*", "/mcp"],
    },
    exports: {
      // Finishes recipe imports in the background. See src/server/recipe-import.
      RecipeImportWorkflow: exports.workflow({ name: "soba-recipe-import" }),
    },
    env: {
      // Migrations live in drizzle/migrations; the db:migrate scripts pass that directory.
      DB: bindings.d1({ name: "soba-db", id: "3c45797e-8236-4864-af08-a21627c98756" }),
      // Recipe photos, keyed by household. See src/server/photos.
      PHOTOS: bindings.r2({ name: "soba-photos" }),
      RECIPE_IMPORT: bindings.workflow({
        name: "soba-recipe-import",
        worker: "soba",
        exportName: "RecipeImportWorkflow",
      }),
      AUTH_RATE_LIMITER: bindings.rateLimit({
        namespace: "1001",
        simple: { limit: 30, period: 60 },
      }),
      // Recipe imports call a paid model; keyed by user. See src/server/recipe-import.
      IMPORT_RATE_LIMITER: bindings.rateLimit({
        namespace: "1002",
        simple: { limit: 10, period: 60 },
      }),
      // MCP requests, keyed by member. See src/server/mcp.
      MCP_RATE_LIMITER: bindings.rateLimit({
        namespace: "1003",
        simple: { limit: 120, period: 60 },
      }),
      // Shared recipes, which anyone can ask for; keyed by address. See src/server/recipes.
      PUBLIC_RATE_LIMITER: bindings.rateLimit({
        namespace: "1004",
        simple: { limit: 60, period: 60 },
      }),
      // Resizes recipe photos, and turns WebP into JPEG, for shared recipes' link previews.
      IMAGES: bindings.images(),
      ASSETS: bindings.assets(),
      BETTER_AUTH_SECRET: bindings.secret(),
      BETTER_AUTH_URL: bindings.secret(),
      GOOGLE_CLIENT_ID: bindings.secret(),
      GOOGLE_CLIENT_SECRET: bindings.secret(),
      // Admins, comma-separated. They're always let into the beta, and can manage it at /admin.
      ADMIN_EMAILS: bindings.secret(),
      // Recipe imports call models through AI Gateway, which holds the provider keys or bills
      // through Unified Billing. The URL is https://gateway.ai.cloudflare.com/v1/<account>/<gateway>.
      AI_GATEWAY_URL: bindings.secret(),
      AI_GATEWAY_TOKEN: bindings.secret(),
    },
  },
});

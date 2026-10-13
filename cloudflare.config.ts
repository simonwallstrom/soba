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
    // Reads recipes whose profile is missing or out of date. See src/server/recipe-profile.
    triggers: [triggers.scheduled({ schedule: "*/5 * * * *" })],
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/", "/api/*"],
    },
    exports: {
      // Held each household's LiveStore event log, before recipes moved to D1.
      SyncBackendDO: exports.durableObject({ state: "deleted" }),
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
      // Workers AI, for Clef. See src/server/recipe-profile. Models only run on Cloudflare, so
      // local dev calls them remotely, which needs a Cloudflare login.
      AI: bindings.ai({ dev: { remote: true } }),
      ASSETS: bindings.assets(),
      BETTER_AUTH_SECRET: bindings.secret(),
      BETTER_AUTH_URL: bindings.secret(),
      GOOGLE_CLIENT_ID: bindings.secret(),
      GOOGLE_CLIENT_SECRET: bindings.secret(),
      AUTH_ALLOWED_EMAILS: bindings.secret(),
      // Recipe imports call models through AI Gateway, which holds the provider keys or bills
      // through Unified Billing. The URL is https://gateway.ai.cloudflare.com/v1/<account>/<gateway>.
      AI_GATEWAY_URL: bindings.secret(),
      AI_GATEWAY_TOKEN: bindings.secret(),
    },
  },
});

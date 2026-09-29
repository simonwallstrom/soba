import { makeWorker } from "@livestore/adapter-web/worker";
import { makeWsSync } from "@livestore/sync-cf/client";
import { recipeSchema } from "@shared/recipes";

makeWorker({
  schema: recipeSchema,
  sync: {
    backend: makeWsSync({ url: `${self.location.origin}/api/sync` }),
    initialSyncOptions: { _tag: "Skip" },
  },
});

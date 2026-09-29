import { makePersistedAdapter } from "@livestore/adapter-web";
// Vite supplies the default export for ?sharedworker modules.
// oxlint-disable-next-line import/default
import SharedWorker from "@livestore/adapter-web/shared-worker?sharedworker";
import type { Adapter } from "@livestore/livestore";
import { StoreRegistry } from "@livestore/react";

// Vite supplies the default export for ?worker modules.
// oxlint-disable-next-line import/default
import RecipeWorker from "./worker?worker";

export const adapter: Adapter = makePersistedAdapter({
  worker: RecipeWorker,
  sharedWorker: SharedWorker,
  storage: { type: "opfs" },
});

export const storeRegistry = new StoreRegistry();

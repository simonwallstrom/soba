import { adapter, storeRegistry } from "@client/lib/livestore/adapter";
import type { Queryable, RegistryStoreOptions, Store } from "@livestore/livestore";
import { storeOptions, useStore } from "@livestore/react";
import type { ReactApi } from "@livestore/react";
import { householdStoreId } from "@shared/household";
import { recipeSchema } from "@shared/recipes";

export function householdStoreOptions(
  householdId: string,
): RegistryStoreOptions<typeof recipeSchema> {
  return storeOptions({ storeId: householdStoreId(householdId), schema: recipeSchema, adapter });
}

const openingStores = new Map<string, Promise<unknown>>();

// Resolves once the household store is open, as the same promise on every call.
// LiveStore's useStore calls use() only while a store opens, which React reports as a
// conditional use() on the retry; suspending on this first keeps every use() unconditional.
export function householdStoreReady(householdId: string) {
  let ready = openingStores.get(householdId);
  if (!ready) {
    const storeOrPromise = storeRegistry.getOrLoadPromise(householdStoreOptions(householdId));
    // React reads `status` and `value` to skip suspending on a promise it already knows is done.
    ready =
      storeOrPromise instanceof Promise
        ? storeOrPromise
        : Object.assign(Promise.resolve(storeOrPromise), {
            status: "fulfilled",
            value: storeOrPromise,
          });
    // A failed open is retried on the next render instead of failing forever.
    ready.catch(() => openingStores.delete(householdId));
    openingStores.set(householdId, ready);
  }
  return ready;
}

export function useHouseholdStore(householdId: string): Store<typeof recipeSchema> & ReactApi {
  return useStore(householdStoreOptions(householdId));
}

// Reads a live query from the household store and re-renders when its result changes.
export function useHouseholdQuery<TResult>(
  householdId: string,
  query: Queryable<TResult>,
): TResult {
  const store = useHouseholdStore(householdId);
  // LiveStore's store-bound hook is stable for this store instance.
  // oxlint-disable-next-line react/hooks
  return store.useQuery(query);
}

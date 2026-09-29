import { api } from "@client/lib/api";

/** Closes the household store, then asks the server to clear this browser's site storage. */
export async function resetLocalData() {
  // Loaded lazily so public pages do not download LiveStore.
  const { storeRegistry } = await import("@client/lib/livestore/adapter");
  await storeRegistry.dispose();
  try {
    await api["local-data"].clear.$post();
  } catch {
    // Offline: the local copy stays until the next reset, but sync access is already gone.
  }
}

import { api } from "@client/lib/api";

/**
 * Asks the server to clear what this browser stored: the cached session and the household's
 * recipes and meal plan. The reload that follows drops the copies held in memory.
 */
export async function resetLocalData() {
  try {
    await api["local-data"].clear.$post();
  } catch {
    // Offline: what's stored stays until the next reset, but the server already denies the
    // session, and stored household data only shows to the member it was saved for.
  }
}

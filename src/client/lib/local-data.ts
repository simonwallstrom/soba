import { api } from "@client/lib/api";

/**
 * Asks the server to clear what this browser stored, such as the cached session. The household's
 * recipes are only held in memory, so the reload that follows drops them.
 */
export async function resetLocalData() {
  try {
    await api["local-data"].clear.$post();
  } catch {
    // Offline: the stored session stays until the next reset, but the server already denies it.
  }
}

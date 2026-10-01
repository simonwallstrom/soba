export const MAX_HOUSEHOLD_MEMBERS = 20;

// Each household syncs one history of recipe events. Bumping this starts every household on an
// empty history and leaves the old one unused, so only do it while no data needs keeping. To
// change an event's shape, add a new event version instead (see AGENTS.md).
// v2: production held a v1.RecipeCreated from before the event gained a required createdBy.
const SYNC_HISTORY_VERSION = 2;

const STORE_ID_PREFIX = `household-v${SYNC_HISTORY_VERSION}-`;

export function householdStoreId(householdId: string) {
  return `${STORE_ID_PREFIX}${householdId}`;
}

export function parseHouseholdStoreId(storeId: string) {
  return storeId.startsWith(STORE_ID_PREFIX) ? storeId.slice(STORE_ID_PREFIX.length) : null;
}

export const MAX_HOUSEHOLD_MEMBERS = 20;

const STORE_ID_PREFIX = "household-";

export function householdStoreId(householdId: string) {
  return `${STORE_ID_PREFIX}${householdId}`;
}

export function parseHouseholdStoreId(storeId: string) {
  return storeId.startsWith(STORE_ID_PREFIX) ? storeId.slice(STORE_ID_PREFIX.length) : null;
}

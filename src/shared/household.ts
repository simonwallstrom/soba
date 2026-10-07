export const MAX_HOUSEHOLD_MEMBERS = 20;

// Each household syncs one history of recipe events. Bumping this starts every household on an
// empty history and leaves the old one unused, so only do it while no data needs keeping. To
// change an event's shape, add a new event version instead (see docs/local-first-sync.md).
// v2: production held a v1.RecipeCreated from before the event gained a required createdBy.
// v3: v1.RecipeProfiled gained a required version and sourceHash.
const SYNC_HISTORY_VERSION = 3;

const STORE_ID_PREFIX = `household-v${SYNC_HISTORY_VERSION}-`;

export function householdStoreId(householdId: string) {
  return `${STORE_ID_PREFIX}${householdId}`;
}

export function parseHouseholdStoreId(storeId: string) {
  return storeId.startsWith(STORE_ID_PREFIX) ? storeId.slice(STORE_ID_PREFIX.length) : null;
}

// Imported recipes are translated into the household's language and converted to its units.
export const householdLanguages = [
  { value: "en", label: "English" },
  { value: "sv", label: "Svenska" },
  { value: "da", label: "Dansk" },
  { value: "nb", label: "Norsk" },
  { value: "fi", label: "Suomi" },
  { value: "de", label: "Deutsch" },
  { value: "nl", label: "Nederlands" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "it", label: "Italiano" },
] as const;
export type HouseholdLanguage = (typeof householdLanguages)[number]["value"];

export const householdUnits = [
  { value: "metric", label: "Metric (g, ml, °C)" },
  { value: "us", label: "US (cups, oz, °F)" },
] as const;
export type HouseholdUnits = (typeof householdUnits)[number]["value"];

export function isHouseholdLanguage(value: string): value is HouseholdLanguage {
  return householdLanguages.some((language) => language.value === value);
}

// A new household's language follows the browser that creates it, falling back to English.
export function defaultHouseholdLanguage(locales: readonly string[]): HouseholdLanguage {
  for (const locale of locales) {
    const code = locale.split("-")[0]?.toLowerCase() ?? "";
    // Norwegian browsers report "no" or "nn" as often as "nb".
    const language = code === "no" || code === "nn" ? "nb" : code;
    if (isHouseholdLanguage(language)) return language;
  }
  return "en";
}

// US customary units only for American English; everyone else cooks in metric.
export function defaultHouseholdUnits(locales: readonly string[]): HouseholdUnits {
  return locales[0]?.toLowerCase() === "en-us" ? "us" : "metric";
}

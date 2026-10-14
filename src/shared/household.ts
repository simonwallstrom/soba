export const MAX_HOUSEHOLD_MEMBERS = 20;

// Imported recipes are translated into the household's language and converted to its units.
export const householdLanguages = [
  { value: "en", label: "English" },
  { value: "sv", label: "Svenska" },
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
    const language = locale.split("-")[0]?.toLowerCase() ?? "";
    if (isHouseholdLanguage(language)) return language;
  }
  return "en";
}

// US customary units only for American English; everyone else cooks in metric.
export function defaultHouseholdUnits(locales: readonly string[]): HouseholdUnits {
  return locales[0]?.toLowerCase() === "en-us" ? "us" : "metric";
}

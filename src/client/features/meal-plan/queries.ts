import { queryDb } from "@livestore/livestore";
import { declinedSuggestions, plannedMeals, recipeProfiles } from "@shared/meal-plan";

export const plannedMeals$ = queryDb(plannedMeals.select(), { label: "plannedMeals" });

export const declinedSuggestions$ = queryDb(declinedSuggestions.select(), {
  label: "declinedSuggestions",
});

export const recipeProfiles$ = queryDb(recipeProfiles.select(), { label: "recipeProfiles" });

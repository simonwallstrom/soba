import { queryDb } from "@livestore/livestore";
import { declinedSuggestions, plannedMeals } from "@shared/meal-plan";

export const plannedMeals$ = queryDb(plannedMeals.select(), { label: "plannedMeals" });

export const declinedSuggestions$ = queryDb(declinedSuggestions.select(), {
  label: "declinedSuggestions",
});

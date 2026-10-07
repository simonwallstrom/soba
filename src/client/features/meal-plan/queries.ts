import { queryDb } from "@livestore/livestore";
import { plannedMeals } from "@shared/meal-plan";

export const plannedMeals$ = queryDb(plannedMeals.select(), { label: "plannedMeals" });

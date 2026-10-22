import { toast } from "@client/components/ui/toast";
import { createHouseholdData } from "@client/features/household/data";
import { useRecipes } from "@client/features/recipes/recipe-data";
import { api } from "@client/lib/api";
import { withMealMoved, withMealsPlanned, withMealsUnplanned } from "@shared/meal-plan";
import type { PlannedMealRow } from "@shared/meal-plan";
import * as v from "valibot";

// The copy kept in this browser between visits, as JSON.
const storedPlan = v.array(
  v.object({
    date: v.string(),
    recipeId: v.string(),
    plannedBy: v.string(),
    plannedAt: v.pipe(
      v.string(),
      v.isoTimestamp(),
      v.transform((value) => new Date(value)),
    ),
  }),
);

export const mealPlanData = createHouseholdData<PlannedMealRow[]>({
  queryKey: ["meal-plan"],
  storageKey: "soba-meal-plan",
  schema: storedPlan,
  fetchData: async (signal) => {
    const response = await api["meal-plan"].$get({}, { init: { signal, cache: "no-store" } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const { meals } = await response.json();
    return meals.map((meal) => ({ ...meal, plannedAt: new Date(meal.plannedAt) }));
  },
});

// A meal whose recipe is in Recently deleted stays planned, to come back with it, but is hidden,
// leaving its day open.
export function usePlannedMeals() {
  const recipeIds = new Set(useRecipes().map((recipe) => recipe.id));
  return mealPlanData.useData().filter((meal) => recipeIds.has(meal.recipeId));
}

type MealToPlan = { date: string; recipeId: string };

// Plans a dinner for each day, replacing any already there.
export function planMeals(userId: string, meals: readonly MealToPlan[]) {
  if (meals.length === 0) return;
  const plannedAt = new Date();
  const rows = meals.map(({ date, recipeId }) => ({
    date,
    recipeId,
    plannedBy: userId,
    plannedAt,
  }));
  void mealPlanData.save(
    (plan) => withMealsPlanned(plan, rows),
    () =>
      api["meal-plan"].$put({
        json: {
          meals: rows.map(({ date, recipeId }) => ({ date, recipeId })),
        },
      }),
  );
}

export function planMeal(userId: string, date: string, recipeId: string) {
  planMeals(userId, [{ date, recipeId }]);
}

export function unplanMeals(dates: readonly string[]) {
  if (dates.length === 0) return;
  void mealPlanData.save(
    (plan) => withMealsUnplanned(plan, dates),
    () => api["meal-plan"].remove.$post({ json: { dates: [...dates] } }),
  );
}

// Moves a day's meal to another, swapping with the meal already there.
export function moveMeal(from: string, to: string) {
  // The two days as they end up, so the change reads the same once the server has made it.
  const moved = withMealMoved(mealPlanData.read() ?? [], from, to).filter(
    (meal) => meal.date === from || meal.date === to,
  );
  void mealPlanData.save(
    (plan) => withMealsPlanned(withMealsUnplanned(plan, [from, to]), moved),
    () => api["meal-plan"].move.$post({ json: { from, to } }),
  );
}

// One click removes a meal, so the toast can put it back.
export function removeMeal(userId: string, meal: PlannedMealRow, title: string | undefined) {
  unplanMeals([meal.date]);
  toast.add({
    title: title ? `Removed ${title}` : "Removed from the plan",
    actionProps: {
      children: "Undo",
      onClick: () => planMeal(userId, meal.date, meal.recipeId),
    },
  });
}

import { toast } from "@client/components/ui/toast";
import type { useHouseholdStore } from "@client/features/household/store";
import { mealMoved, mealPlanned, mealSuggestionDeclined, mealUnplanned } from "@shared/meal-plan";
import type { DeclineKind, PlannedMealRow } from "@shared/meal-plan";

type HouseholdStore = ReturnType<typeof useHouseholdStore>;

// Plans a recipe for a day, keeping the suggestion `from` was part of, if any.
export function planMeal(userId: string, date: string, recipeId: string, from?: PlannedMealRow) {
  return mealPlanned({
    date,
    recipeId,
    ...(from?.suggestionId
      ? { suggestion: { id: from.suggestionId, alternatives: from.alternatives } }
      : {}),
    plannedBy: userId,
    plannedAt: new Date(),
  });
}

export function unplanMeal(userId: string, date: string) {
  return mealUnplanned({ date, unplannedBy: userId, unplannedAt: new Date() });
}

// Moves a day's meal to another, swapping with the meal already there.
export function moveMeal(userId: string, from: string, to: string) {
  return mealMoved({ from, to, movedBy: userId, movedAt: new Date() });
}

export function declineMeal(userId: string, meal: PlannedMealRow, kind: DeclineKind) {
  return mealSuggestionDeclined({
    date: meal.date,
    recipeId: meal.recipeId,
    kind,
    declinedBy: userId,
    declinedAt: new Date(),
  });
}

// One click removes a meal, so the toast can put it back. Removing a suggestion counts against
// it, until the undo plans it again.
export function removeMeal(
  store: HouseholdStore,
  userId: string,
  meal: PlannedMealRow,
  title: string | undefined,
) {
  store.commit(
    ...(meal.suggestionId ? [declineMeal(userId, meal, "removed")] : []),
    unplanMeal(userId, meal.date),
  );
  toast.add({
    title: title ? `Removed ${title}` : "Removed from the plan",
    actionProps: {
      children: "Undo",
      onClick: () => store.commit(planMeal(userId, meal.date, meal.recipeId, meal)),
    },
  });
}

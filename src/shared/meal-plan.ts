// Days are local calendar dates, "2026-10-12", so a plan means the same day on every device.
export const mealDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

// One dinner a day. The last plan for a day wins.
export type PlannedMealRow = {
  date: string;
  recipeId: string;
  // Set on suggested meals: the suggestion that planned it, for undoing it as a whole.
  suggestionId: string | null;
  plannedBy: string;
  plannedAt: Date;
};

// How each change to the plan plays out. The app applies these to its copy right away, and the
// API does the same in the database.

export function withMealsPlanned(
  plan: readonly PlannedMealRow[],
  meals: readonly PlannedMealRow[],
): PlannedMealRow[] {
  const byDate = new Map([...plan, ...meals].map((meal) => [meal.date, meal]));
  return [...byDate.values()];
}

export function withMealsUnplanned(
  plan: readonly PlannedMealRow[],
  dates: readonly string[],
): PlannedMealRow[] {
  return plan.filter((meal) => !dates.includes(meal.date));
}

// Moves a day's meal to another day. A meal already there swaps to the first day, so nothing is
// lost, and both keep who planned them and the suggestion they came from.
export function withMealMoved(plan: readonly PlannedMealRow[], from: string, to: string) {
  const moving = plan.find((meal) => meal.date === from);
  if (!moving || from === to) return [...plan];
  const swapping = plan.find((meal) => meal.date === to);
  return [
    ...plan.filter((meal) => meal.date !== from && meal.date !== to),
    ...(swapping ? [{ ...swapping, date: from }] : []),
    { ...moving, date: to },
  ];
}

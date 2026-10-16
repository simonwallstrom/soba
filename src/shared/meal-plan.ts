// Days are local calendar dates, "2026-10-12", so a plan means the same day on every device.
export const mealDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

// One dinner a day. The last plan for a day wins.
export type PlannedMealRow = {
  date: string;
  recipeId: string;
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
// lost, and both keep who planned them.
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

// When each recipe was last eaten, on a day before `today`, and when it's next planned, from
// `today` on. Days are keys like "2026-10-12", so they compare as strings.
export function mealHistory(
  plan: readonly Pick<PlannedMealRow, "date" | "recipeId">[],
  today: string,
) {
  const lastEaten = new Map<string, string>();
  const nextPlanned = new Map<string, string>();
  for (const { date, recipeId } of plan) {
    if (date < today) {
      if (date > (lastEaten.get(recipeId) ?? "")) lastEaten.set(recipeId, date);
    } else if (date < (nextPlanned.get(recipeId) ?? "9999-12-31")) {
      nextPlanned.set(recipeId, date);
    }
  }
  return { lastEaten, nextPlanned };
}

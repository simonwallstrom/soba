import { dayKey, getWeek, isPast, startOfDay } from "@client/features/meal-plan/weeks";
import type { PlannedMealRow } from "@shared/meal-plan";

// The planner reaches back to the first planned week, at most this far, and always this far ahead.
const maxWeeksBefore = 12;
const weeksAfter = 8;

export type PlannerWeek = {
  // Weeks from the current one: 0 is this week, negative numbers are past weeks.
  offset: number;
  number: number;
  days: Date[];
};

// Planned meals by day, keyed by `dayKey`.
export type MealPlan = ReadonlyMap<string, PlannedMealRow>;

// Past weeks back to the first one with a meal, this week, and the weeks ahead. Past weeks
// can't change, so the list stays put while the household plans.
export function getPlannerWeeks(today: Date, plan: MealPlan) {
  const [thisMonday] = getWeek(today).days;
  const firstPlanned = [...plan.keys()].toSorted()[0];
  const weeksBefore =
    thisMonday && firstPlanned && firstPlanned < dayKey(thisMonday)
      ? Math.min(
          maxWeeksBefore,
          Math.ceil(
            (thisMonday.getTime() - new Date(`${firstPlanned}T00:00`).getTime()) / 604_800_000,
          ),
        )
      : 0;
  const weeks: PlannerWeek[] = Array.from({ length: weeksBefore + 1 + weeksAfter }, (_, index) => {
    const offset = index - weeksBefore;
    const date = startOfDay(today);
    date.setDate(date.getDate() + offset * 7);
    return { offset, ...getWeek(date) };
  });
  return { weeks, currentWeekIndex: weeksBefore };
}

// A week's meals for the same weekdays of another, on its open days that haven't passed.
export function copyMeals(from: PlannerWeek, to: PlannerWeek, plan: MealPlan, today: Date) {
  return from.days.flatMap((date, index) => {
    const meal = plan.get(dayKey(date));
    const target = to.days[index];
    if (!meal || !target || isPast(target, today) || plan.has(dayKey(target))) return [];
    return [{ date: dayKey(target), recipeId: meal.recipeId }];
  });
}

// The days a week's meals can be cleared from: the planned ones that haven't passed.
export function clearableDays(week: PlannerWeek, plan: MealPlan, today: Date) {
  return week.days
    .filter((date) => !isPast(date, today) && plan.has(dayKey(date)))
    .map((date) => dayKey(date));
}

const rangeFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export function formatWeekRange(week: PlannerWeek) {
  const first = week.days[0];
  const last = week.days.at(-1);
  return first && last ? rangeFormat.formatRange(first, last) : "";
}

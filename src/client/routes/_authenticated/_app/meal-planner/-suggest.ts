import { dayKey, isPast, weekdayOf } from "@client/features/meal-plan/weeks";
import type { DeclinedSuggestion, DeclineKind } from "@shared/meal-plan";
import type { RecipeProfileAnswers } from "@shared/recipe-profile";

import type { MealPlan, PlannerWeek } from "./-meal-plan";

// How much turning a suggestion down counts against that recipe on that weekday.
const declineWeights: Record<DeclineKind, number> = { shuffled: -0.5, removed: -1.5 };

// A local date from `dayKey`.
function parseDay(key: string) {
  return new Date(`${key}T00:00`);
}

function mondayOf(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekdayOf(date)).getTime();
}

// Weeks between the Mondays of two dates; daylight saving shifts a week by an hour at most.
function weeksBetween(earlier: Date, later: Date) {
  return Math.round((mondayOf(later) - mondayOf(earlier)) / 604_800_000);
}

// What the planner has learned from the days already eaten and from declined suggestions. Only
// past days teach habits; meals planned ahead would make it learn from itself.
type Taste = {
  // The share of a weekday's past dinners that were this recipe, keyed `recipeId:weekday`, for
  // recipes eaten on that weekday at least twice.
  habits: Map<string, number>;
  // The share of a weekday's past dinners that were treats.
  treatShare: number[];
  // Weeks before the planned week that a recipe was last planned, eaten or still ahead.
  lastPlanned: Map<string, number>;
  declines: Map<string, number>;
};

function learn(
  week: PlannerWeek,
  plan: MealPlan,
  profiles: ReadonlyMap<string, RecipeProfileAnswers>,
  declined: readonly DeclinedSuggestion[],
  today: Date,
): Taste {
  const monday = week.days[0] ?? today;
  const counts = new Map<string, number>();
  const lastPlanned = new Map<string, number>();
  const treats = Array.from({ length: 7 }, () => 0);
  // Past dinners per weekday, so a habit is a share of what was actually eaten.
  const dinners = Array.from({ length: 7 }, () => 0);
  for (const [key, { recipeId }] of plan) {
    const date = parseDay(key);
    const weeksAgo = weeksBetween(date, monday);
    if (weeksAgo <= 0) continue;
    lastPlanned.set(recipeId, Math.min(lastPlanned.get(recipeId) ?? weeksAgo, weeksAgo));
    const profile = profiles.get(recipeId);
    if (!isPast(date, today) || !profile) continue;
    const weekday = weekdayOf(date);
    dinners[weekday] = (dinners[weekday] ?? 0) + 1;
    counts.set(`${recipeId}:${weekday}`, (counts.get(`${recipeId}:${weekday}`) ?? 0) + 1);
    if (profile.isTreat) treats[weekday] = (treats[weekday] ?? 0) + 1;
  }
  const habits = new Map<string, number>();
  for (const [key, count] of counts) {
    const weekday = Number(key.split(":")[1]);
    if (count >= 2) habits.set(key, count / (dinners[weekday] ?? 1));
  }
  const declines = new Map<string, number>();
  for (const { date, recipeId, kind } of declined) {
    const key = `${recipeId}:${weekdayOf(parseDay(date))}`;
    declines.set(key, (declines.get(key) ?? 0) + declineWeights[kind]);
  }
  return {
    habits,
    treatShare: dinners.map((total, weekday) => (total > 0 ? (treats[weekday] ?? 0) / total : 0)),
    lastPlanned,
    declines,
  };
}

// What eating a recipe again costs, by how many weeks ago it was last planned. Last week's is
// worth avoiding, three weeks back much less.
const recentPenalties: Record<number, number> = { 1: -3, 2: -2, 3: -1 };

// What favoriting adds, per member who favorited a recipe, up to two. Enough to beat the small
// nudges, like fish on a weeknight, but not having had it last week or an involved weeknight.
const favoriteBonus = 1.5;
// Random noise added to every score, so near-ties vary between runs instead of always going to
// the first recipe in the list. Small enough not to beat a real preference.
const tieBreak = 0.4;

// Scores a recipe for a day: higher is a better fit.
function rate(
  recipeId: string,
  profile: RecipeProfileAnswers,
  weekday: number,
  planned: readonly RecipeProfileAnswers[],
  taste: Taste,
  favoritedBy: number,
) {
  const habit = taste.habits.get(`${recipeId}:${weekday}`) ?? 0;
  const treatShare = taste.treatShare[weekday] ?? 0;
  const weeksAgo = taste.lastPlanned.get(recipeId);
  const isWeeknight = weekday <= 3;
  const sameBase = planned.filter((other) => other.base === profile.base).length;
  const sameProtein = planned.filter((other) => other.protein === profile.protein).length;
  const hasFish = planned.some((other) => other.protein === "fish");
  return (
    // What the household usually eats on this weekday.
    3 * habit +
    favoriteBonus * Math.min(favoritedBy, 2) +
    (profile.isTreat ? 2.5 * treatShare - 1 : 0) +
    (taste.declines.get(`${recipeId}:${weekday}`) ?? 0) +
    // Not again so soon, unless it's a habit for the day; welcome back after a while.
    (weeksAgo === undefined ? 0.3 : habit >= 0.5 ? 0 : (recentPenalties[weeksAgo] ?? 0.4)) +
    // A varied week: a second dish on the same base is fine now and then, a third almost never.
    -2 * sameBase ** 2 +
    -0.8 * sameProtein ** 2 +
    (sameBase === 0 && profile.base !== "other" ? 0.4 : 0) +
    (profile.protein === "fish" && isWeeknight && !hasFish ? 1 : 0) +
    // Quicker on weeknights, more time on weekends. Nobody makes lasagna from scratch on a
    // Tuesday, unless that's what Tuesdays are for.
    (isWeeknight
      ? profile.effort === "involved"
        ? habit >= 0.5
          ? 0
          : -3
        : profile.effort === "quick"
          ? 0.3
          : 0
      : weekday >= 5 && profile.effort === "involved"
        ? 0.5
        : 0)
  );
}

export type SuggestedMeal = { date: string; recipeId: string; alternatives: string[] };

export type SuggestInput = {
  plan: MealPlan;
  profiles: ReadonlyMap<string, RecipeProfileAnswers>;
  declined: readonly DeclinedSuggestion[];
  // How many members favorited each recipe.
  favorites: ReadonlyMap<string, number>;
  today: Date;
  // Between 0 and 1; tests pass a fixed one.
  random?: () => number;
};

// Fills a week's open days from the household's habits: what they usually eat on each weekday,
// their favorites, what they haven't had in a while, and a varied week, quicker on weeknights.
// Declined suggestions nudge it. Each day keeps a few alternatives like it to shuffle through. It never says why:
// good suggestions speak for themselves.
export function suggestWeek(
  week: PlannerWeek,
  { plan, profiles, declined, favorites, today, random = Math.random }: SuggestInput,
): SuggestedMeal[] {
  const taste = learn(week, plan, profiles, declined, today);
  const dinners = [...profiles].filter(([, profile]) => profile.isDinner);
  const thisWeek = new Map(
    week.days.flatMap((date) => {
      const meal = plan.get(dayKey(date));
      return meal ? [[dayKey(date), meal.recipeId] as const] : [];
    }),
  );

  const suggested: SuggestedMeal[] = [];
  for (const date of week.days) {
    const key = dayKey(date);
    if (thisWeek.has(key) || isPast(date, today)) continue;
    const taken = new Set(thisWeek.values());
    const planned = [...taken].flatMap((recipeId) => profiles.get(recipeId) ?? []);
    const ranked = dinners
      // A recipe picked for one day isn't picked again for another.
      .filter(([recipeId]) => !taken.has(recipeId))
      .map(([recipeId, profile]) => ({
        recipeId,
        profile,
        score:
          rate(recipeId, profile, weekdayOf(date), planned, taste, favorites.get(recipeId) ?? 0) +
          tieBreak * random(),
      }))
      .toSorted((left, right) => right.score - left.score);
    const [pick] = ranked;
    if (!pick) continue;
    const { recipeId } = pick;
    // Shuffling keeps what the day is for: another pasta for a pasta, another treat for a treat.
    const alternatives = ranked
      .filter(
        ({ profile }) =>
          profile.base === pick.profile.base && profile.isTreat === pick.profile.isTreat,
      )
      .slice(0, 5)
      .map((option) => option.recipeId);
    thisWeek.set(key, recipeId);
    suggested.push({ date: key, recipeId, alternatives });
  }
  return suggested;
}

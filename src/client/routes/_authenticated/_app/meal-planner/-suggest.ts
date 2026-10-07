import { dayKey, isPast, weekdayOf } from "@client/features/meal-plan/weeks";
import type { RecipeProfileAnswers } from "@shared/recipe-profile";

import type { MealPlan, PlannerWeek } from "./-meal-plan";

// Weeks until a habit counts half, so the planner follows a household that changes its ways.
const habitHalfLife = 12;

function fade(weeksAgo: number, halfLife: number) {
  return 0.5 ** (Math.max(weeksAgo, 0) / halfLife);
}

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

// Whole days between two dates, rounded past daylight saving's extra or missing hour.
function daysBetween(earlier: Date, later: Date) {
  return Math.round((later.getTime() - earlier.getTime()) / 86_400_000);
}

// What the planner has learned from the days already eaten. Only past days count; meals planned
// ahead would make it learn from itself. For the same reason a habit must start with meals the
// household picked themselves: accepted suggestions keep a habit going, but can't start one, or
// the planner would repeat its own picks forever.
//
// Nothing else teaches it. Shuffling is browsing, often back to where it started; removing a meal
// usually means the day is taken; and favorites are pins for quick access, not a taste.
type Taste = {
  // The share of a weekday's recent dinners that were this recipe, keyed `recipeId:weekday`,
  // for recipes the household picked on that weekday at least twice.
  habits: Map<string, number>;
  // The share of a weekday's recent dinners the household picked that were treats.
  treatShare: number[];
  // The last day before the planned week that a recipe was planned, eaten or still ahead.
  lastPlanned: Map<string, Date>;
};

function addTo<K>(map: Map<K, number>, key: K, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

export function learn(
  week: PlannerWeek,
  plan: MealPlan,
  profiles: ReadonlyMap<string, RecipeProfileAnswers>,
  today: Date,
): Taste {
  const monday = week.days[0] ?? today;
  // Times the household picked a recipe on a weekday, keyed `recipeId:weekday`.
  const picks = new Map<string, number>();
  // Times eaten on a weekday however it was planned, faded by age.
  const eaten = new Map<string, number>();
  const lastPlanned = new Map<string, Date>();
  // Faded totals per weekday: every dinner, and the household's own picks and treats among them.
  const dinners = Array.from({ length: 7 }, () => 0);
  const picked = Array.from({ length: 7 }, () => 0);
  const treats = Array.from({ length: 7 }, () => 0);
  for (const [key, { recipeId, suggestionId }] of plan) {
    const date = parseDay(key);
    const weeksAgo = weeksBetween(date, monday);
    if (weeksAgo <= 0) continue;
    const last = lastPlanned.get(recipeId);
    if (!last || date > last) lastPlanned.set(recipeId, date);
    const profile = profiles.get(recipeId);
    if (!isPast(date, today) || !profile) continue;
    const weekday = weekdayOf(date);
    const weight = fade(weeksAgo, habitHalfLife);
    dinners[weekday] = (dinners[weekday] ?? 0) + weight;
    addTo(eaten, `${recipeId}:${weekday}`, weight);
    if (suggestionId) continue;
    addTo(picks, `${recipeId}:${weekday}`, 1);
    picked[weekday] = (picked[weekday] ?? 0) + weight;
    if (profile.isTreat) treats[weekday] = (treats[weekday] ?? 0) + weight;
  }
  const habits = new Map<string, number>();
  for (const [key, count] of picks) {
    const weekday = Number(key.split(":")[1]);
    if (count >= 2) habits.set(key, (eaten.get(key) ?? 0) / (dinners[weekday] ?? 1));
  }
  return {
    habits,
    treatShare: picked.map((total, weekday) => (total > 0 ? (treats[weekday] ?? 0) / total : 0)),
    lastPlanned,
  };
}

// What eating a recipe again costs, by how many whole weeks since it was last planned. Within a
// week is almost never right; three weeks on, much less of a problem.
const recentPenalties: Record<number, number> = { 0: -5, 1: -3, 2: -2, 3: -1 };

// Random noise added to every score, so near-ties vary between runs instead of always going to
// the first recipe in the list. Small enough not to beat a real preference.
const tieBreak = 0.4;

// Scores a recipe for a day: higher is a better fit.
function rate(
  recipeId: string,
  profile: RecipeProfileAnswers,
  date: Date,
  planned: readonly RecipeProfileAnswers[],
  taste: Taste,
) {
  const weekday = weekdayOf(date);
  const last = taste.lastPlanned.get(recipeId);
  const weeksSince = last ? Math.floor(daysBetween(last, date) / 7) : undefined;
  const habit = taste.habits.get(`${recipeId}:${weekday}`) ?? 0;
  const treatShare = taste.treatShare[weekday] ?? 0;
  const isWeeknight = weekday <= 3;
  const sameBase = planned.filter((other) => other.base === profile.base).length;
  const sameProtein = planned.filter((other) => other.protein === profile.protein).length;
  const hasFish = planned.some((other) => other.protein === "fish");
  const treatsPlanned = planned.filter((other) => other.isTreat).length;
  return (
    // What the household usually eats on this weekday.
    3 * habit +
    // Treats on the days the household has them, and one a week at most. Until the household
    // shows its treat days, weekends are for treats.
    (profile.isTreat ? 2.5 * treatShare - (isWeeknight ? 2 : 0.5) - 3 * treatsPlanned : 0) +
    // Not again so soon, unless it's a habit for the day; welcome back after a while.
    (weeksSince === undefined ? 0.3 : habit >= 0.5 ? 0 : (recentPenalties[weeksSince] ?? 0.4)) +
    // A varied week: a second dish on the same base is fine now and then, a third almost never.
    -2 * sameBase ** 2 +
    -0.8 * sameProtein ** 2 +
    (sameBase === 0 && profile.base !== "other" ? 0.4 : 0) +
    (profile.protein === "fish" && isWeeknight && !hasFish ? 1 : 0) +
    // Quicker on weeknights, more time on weekends. Nobody makes lasagna from scratch on a
    // Tuesday, unless that's what Tuesdays are for: better a quick dish from last week.
    (isWeeknight
      ? profile.effort === "involved"
        ? habit >= 0.5
          ? 0
          : -4.5
        : profile.effort === "quick"
          ? 0.3
          : 0
      : weekday >= 5 && profile.effort === "involved"
        ? 0.5
        : 0)
  );
}

export type SuggestedMeal = { date: string; recipeId: string };

export type SuggestInput = {
  plan: MealPlan;
  profiles: ReadonlyMap<string, RecipeProfileAnswers>;
  today: Date;
  // Between 0 and 1; tests pass a fixed one.
  random?: () => number;
};

// Fills a week's open days from the household's habits: what they usually eat on each weekday,
// what they haven't had in a while, and a varied week, quicker on weeknights. It never says why:
// good suggestions speak for themselves.
export function suggestWeek(
  week: PlannerWeek,
  { plan, profiles, today, random = Math.random }: SuggestInput,
): SuggestedMeal[] {
  const taste = learn(week, plan, profiles, today);
  const dinners = [...profiles].filter(([, profile]) => profile.isDinner);
  const thisWeek = new Map(
    week.days.flatMap((date) => {
      const meal = plan.get(dayKey(date));
      return meal ? [[dayKey(date), meal.recipeId] as const] : [];
    }),
  );
  const open = week.days.filter((date) => !thisWeek.has(dayKey(date)) && !isPast(date, today));
  // One roll per day and recipe, so rescoring a day doesn't reroll it.
  const noise = new Map<string, number>();
  function jitter(key: string) {
    if (!noise.has(key)) noise.set(key, tieBreak * random());
    return noise.get(key) ?? 0;
  }

  // The best recipe for a day, given what's already planned this week.
  function best(date: Date) {
    const taken = new Set(thisWeek.values());
    const planned = [...taken].flatMap((recipeId) => profiles.get(recipeId) ?? []);
    let top: { recipeId: string; score: number } | undefined;
    // A recipe picked for one day isn't picked again for another.
    for (const [recipeId, profile] of dinners) {
      if (taken.has(recipeId)) continue;
      const score =
        rate(recipeId, profile, date, planned, taste) + jitter(`${dayKey(date)}:${recipeId}`);
      if (!top || score > top.score) top = { recipeId, score };
    }
    return top;
  }

  // Fills the day with the strongest pick first, so taco Friday is planned before a Wednesday
  // that would happily take the tacos.
  const suggested: SuggestedMeal[] = [];
  while (open.length > 0) {
    const [next] = open
      .map((date) => ({ date, pick: best(date) }))
      .toSorted(
        (left, right) => (right.pick?.score ?? -Infinity) - (left.pick?.score ?? -Infinity),
      );
    if (!next) break;
    open.splice(open.indexOf(next.date), 1);
    if (!next.pick) continue;
    thisWeek.set(dayKey(next.date), next.pick.recipeId);
    suggested.push({ date: dayKey(next.date), recipeId: next.pick.recipeId });
  }
  return suggested.toSorted((left, right) => left.date.localeCompare(right.date));
}

// Whether a recipe can stand in for another when shuffling: another treat for a treat, another
// pasta for a pasta. "Other" is a catch-all base, so those match on protein instead.
function isLike(profile: RecipeProfileAnswers, like: RecipeProfileAnswers) {
  if (!profile.isDinner || profile.isTreat !== like.isTreat) return false;
  if (like.isTreat) return true;
  return like.base === "other"
    ? profile.base === "other" && profile.protein === like.protein
    : profile.base === like.base;
}

// The recipes a day's meal shuffles through, best fit first and including the meal itself:
// every dinner like it that isn't planned within a week of the day. Worked out on each shuffle,
// so recipes added since show up and recent ones drop out. No randomness, so the order holds
// while shuffling round.
export function shuffleOptions(
  week: PlannerWeek,
  date: Date,
  { plan, profiles, today }: Omit<SuggestInput, "random">,
) {
  const key = dayKey(date);
  const current = plan.get(key)?.recipeId;
  const like = current ? profiles.get(current) : undefined;
  if (!current || !like) return [];
  const taste = learn(week, plan, profiles, today);
  const nearby = new Set(
    [...plan]
      .filter(([other]) => other !== key && Math.abs(daysBetween(date, parseDay(other))) < 7)
      .map(([, meal]) => meal.recipeId),
  );
  const planned = week.days.flatMap((day) => {
    const recipeId = dayKey(day) === key ? undefined : plan.get(dayKey(day))?.recipeId;
    return (recipeId && profiles.get(recipeId)) || [];
  });
  return [...profiles]
    .filter(
      ([recipeId, profile]) =>
        recipeId === current || (!nearby.has(recipeId) && isLike(profile, like)),
    )
    .map(([recipeId, profile]) => ({
      recipeId,
      score: rate(recipeId, profile, date, planned, taste),
    }))
    .toSorted((left, right) => right.score - left.score)
    .map(({ recipeId }) => recipeId);
}

// The recipe after `current` in a shuffle, round to the start.
export function nextShuffle(options: readonly string[], current: string) {
  if (options.length < 2) return undefined;
  return options[(options.indexOf(current) + 1) % options.length];
}

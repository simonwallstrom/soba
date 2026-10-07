// Plays a household that accepts every suggested week, starting from the sample recipes and their
// month of dinners, and prints what it ends up eating. Use it to see what a change to the weights
// in src/client/routes/_authenticated/_app/meal-planner/-suggest.ts does over time, beyond the
// single weeks the tests check.
//
// Usage: bun run suggest:simulate [options]
//   --weeks 8              weeks to suggest (default: 8)
//   --seed 1               seed for the tie-break randomness, to compare runs (default: 1)
import { dayKey, getWeek, weekdayOf } from "@client/features/meal-plan/weeks";
import type { PlannedMealRow } from "@shared/meal-plan";

import { suggestWeek } from "../src/client/routes/_authenticated/_app/meal-planner/-suggest";
import { sampleRecipes } from "./seed/sample-recipes";
import { sampleDinnerHistory } from "./seed/seed-events";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function option(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

// A small seeded generator (mulberry32), so two runs with one seed match.
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const weekCount = Number(option("weeks") ?? 8);
// Recipes are keyed by title, which is unique among the samples.
const profiles = new Map(sampleRecipes.map((recipe) => [recipe.title, recipe.profile]));
const random = seeded(Number(option("seed") ?? 1));
const now = new Date();
const plan = new Map<string, PlannedMealRow>();

// Accepted suggestions keep their suggestion, as in the app.
function eat(date: Date, title: string, suggestionId: string | null = null) {
  plan.set(dayKey(date), {
    date: dayKey(date),
    recipeId: title,
    suggestionId,
    plannedBy: "simulation",
    plannedAt: date,
  });
}

for (const { date, title } of sampleDinnerHistory(now)) eat(date, title);

const eaten: { date: Date; title: string }[] = [];
for (let offset = 0; offset < weekCount; offset++) {
  const { days, number } = getWeek(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7 * offset),
  );
  const monday = days[0];
  if (!monday) break;
  // The Sunday before, so the whole week is open and everything before it has been eaten.
  const today = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 1);
  const suggested = suggestWeek({ offset, number, days }, { plan, profiles, today, random });
  console.log(`\nWeek ${number}`);
  for (const { date, recipeId } of suggested) {
    const day = new Date(`${date}T00:00`);
    const profile = profiles.get(recipeId);
    const traits = profile
      ? [profile.base, profile.protein, profile.effort, profile.isTreat ? "treat" : ""].filter(
          Boolean,
        )
      : [];
    console.log(`  ${weekdays[weekdayOf(day)]}  ${recipeId}  (${traits.join(", ")})`);
    eat(day, recipeId, `week-${number}`);
    eaten.push({ date: day, title: recipeId });
  }
}

// What the weeks add up to.
const dinners = sampleRecipes.filter((recipe) => recipe.profile.isDinner);
const counts = new Map<string, number>();
for (const { title } of eaten) counts.set(title, (counts.get(title) ?? 0) + 1);
const involvedWeeknights = eaten.filter(
  ({ date, title }) => weekdayOf(date) <= 3 && profiles.get(title)?.effort === "involved",
).length;
const treatDays = eaten
  .filter(({ title }) => profiles.get(title)?.isTreat)
  .map(({ date }) => weekdays[weekdayOf(date)]);
// The same recipe again within a week.
const soonRepeats = eaten.filter(({ date, title }) =>
  eaten.some(
    (other) =>
      other.title === title &&
      other.date < date &&
      date.getTime() - other.date.getTime() < 7 * 86_400_000,
  ),
).length;

console.log(`\n${eaten.length} dinners over ${weekCount} weeks`);
console.log(`  Recipes used: ${counts.size} of ${dinners.length} dinners`);
console.log(
  `  Never suggested: ${
    dinners
      .filter((recipe) => !counts.has(recipe.title))
      .map((recipe) => recipe.title)
      .join(", ") || "none"
  }`,
);
console.log(
  `  Most often: ${[...counts]
    .toSorted((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([title, count]) => `${title} ×${count}`)
    .join(", ")}`,
);
console.log(`  Involved dishes on weeknights: ${involvedWeeknights}`);
console.log(`  Treats on: ${treatDays.join(", ") || "none"}`);
console.log(`  Repeated within a week: ${soonRepeats}`);

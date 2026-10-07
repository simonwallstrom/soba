import { describe, expect, test } from "bun:test";

import { dayKey, weekdayOf } from "@client/features/meal-plan/weeks";
import type { PlannedMealRow } from "@shared/meal-plan";
import type { RecipeProfileAnswers } from "@shared/recipe-profile";

import { getPlannerWeeks } from "./-meal-plan";
import type { MealPlan } from "./-meal-plan";
import { learn, nextShuffle, shuffleOptions, suggestWeek } from "./-suggest";

// Tuesday 6 October 2026; the week planned is the next one, Monday 12 to Sunday 18.
const today = new Date(2026, 9, 6);

const dinner: RecipeProfileAnswers = {
  isDinner: true,
  base: "other",
  protein: "other",
  effort: "normal",
  isTreat: false,
};

const profiles = new Map<string, RecipeProfileAnswers>([
  ["tacos", { ...dinner, isTreat: true, protein: "beef" }],
  ["salmon", { ...dinner, base: "potato", protein: "fish", effort: "quick" }],
  ["curry", { ...dinner, base: "rice", protein: "chicken" }],
  ["carbonara", { ...dinner, base: "pasta", protein: "pork", effort: "quick" }],
  ["meatballs", { ...dinner, base: "potato", protein: "beef", effort: "involved" }],
  ["soup", { ...dinner, base: "bread", protein: "vegetarian", effort: "quick" }],
  ["risotto", { ...dinner, base: "rice", protein: "vegetarian", effort: "involved" }],
  ["lasagna", { ...dinner, base: "pasta", protein: "vegetarian", effort: "involved" }],
  ["pancakes", { ...dinner, effort: "quick" }],
  ["buns", { ...dinner, isDinner: false }],
]);

function planned(date: Date, recipeId: string): [string, PlannedMealRow] {
  const key = dayKey(date);
  return [
    key,
    {
      date: key,
      recipeId,
      suggestionId: null,
      plannedBy: "u1",
      plannedAt: today,
    },
  ];
}

// Tacos on the last three Fridays.
const fridays = [2, -5, -12].map((day) => new Date(2026, 9, day));
const history: MealPlan = new Map(fridays.map((date) => planned(date, "tacos")));

function nextWeek(plan: MealPlan) {
  const { weeks, currentWeekIndex } = getPlannerWeeks(today, plan);
  const week = weeks[currentWeekIndex + 1];
  if (!week) throw new Error("Expected next week");
  return week;
}

// No randomness, so each test sees one result.
function suggest(
  plan: MealPlan,
  withProfiles: ReadonlyMap<string, RecipeProfileAnswers> = profiles,
) {
  return suggestWeek(nextWeek(plan), { plan, profiles: withProfiles, today, random: () => 0 });
}

// How strong a habit, keyed `recipeId:weekday`, the planner learns from a plan.
function habitAfter(plan: MealPlan, key: string) {
  return learn(nextWeek(plan), plan, profiles, today).habits.get(key);
}

// Tacos on three Fridays from `start`, and other dinners on the last four Fridays.
function fridayTacosHabit(start: Date) {
  const tacos = [0, 1, 2].map((week) =>
    planned(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7 * week), "tacos"),
  );
  const since = ["curry", "soup", "salmon", "carbonara"].map((recipeId, index) =>
    planned(new Date(2026, 8, 11 + 7 * index), recipeId),
  );
  return habitAfter(new Map([...tacos, ...since]), "tacos:4") ?? 0;
}

describe("suggestWeek", () => {
  test("fills every open day with a different dinner", () => {
    const suggested = suggest(history);
    expect(suggested).toHaveLength(7);
    expect(new Set(suggested.map((meal) => meal.recipeId)).size).toBe(7);
    expect(suggested.some((meal) => meal.recipeId === "buns")).toBe(false);
  });

  test("keeps a weekday habit, even though it was eaten last week", () => {
    const friday = suggest(history).find((meal) => meal.date === "2026-10-16");
    expect(friday?.recipeId).toBe("tacos");
  });

  test("leaves planned days alone", () => {
    const plan: MealPlan = new Map([...history, planned(new Date(2026, 9, 12), "curry")]);
    const suggested = suggest(plan);
    expect(suggested.map((meal) => meal.date)).not.toContain("2026-10-12");
    expect(suggested.map((meal) => meal.recipeId)).not.toContain("curry");
  });

  test("lets an old habit fade when the household moved on", () => {
    // Just before the other four, or almost a year earlier.
    const recent = fridayTacosHabit(new Date(2026, 7, 21));
    const yearOld = fridayTacosHabit(new Date(2025, 10, 7));
    expect(recent).toBeCloseTo(3 / 7, 1);
    expect(yearOld).toBeLessThan(recent / 2);
  });

  test("starts habits only from meals the household picked", () => {
    const wednesdays = [new Date(2026, 8, 23), new Date(2026, 8, 30)];
    const accepted: MealPlan = new Map(
      wednesdays.map((date) => {
        const [key, meal] = planned(date, "curry");
        return [key, { ...meal, suggestionId: "s1" }];
      }),
    );
    const picked: MealPlan = new Map(wednesdays.map((date) => planned(date, "curry")));
    expect(habitAfter(accepted, "curry:2")).toBeUndefined();
    expect(habitAfter(picked, "curry:2")).toBe(1);
  });

  test("varies bases even when the fresh recipes share one", () => {
    // Everything but the pasta dishes was eaten last week, and there's a third pasta to pick.
    const lastWeek = ["salmon", "curry", "meatballs", "soup", "risotto", "pancakes", "tacos"];
    const plan: MealPlan = new Map(
      lastWeek.map((recipeId, index) => planned(new Date(2026, 8, 28 + index), recipeId)),
    );
    const withSpaghetti = new Map([
      ...profiles,
      ["spaghetti", { ...dinner, base: "pasta" as const }],
    ]);
    const suggested = suggest(plan, withSpaghetti);
    const pasta = suggested.filter((meal) => withSpaghetti.get(meal.recipeId)?.base === "pasta");
    expect(pasta.length).toBeLessThanOrEqual(2);
  });

  test("keeps involved dishes off weeknights", () => {
    const weeknights = suggest(new Map()).filter(
      (meal) => weekdayOf(new Date(`${meal.date}T00:00`)) <= 3,
    );
    expect(weeknights).toHaveLength(4);
    for (const { recipeId } of weeknights) {
      expect(profiles.get(recipeId)?.effort).not.toBe("involved");
    }
  });

  test("breaks ties at random, so suggesting again can give another week", () => {
    const alike = new Map(Array.from({ length: 10 }, (_, index) => [`dish${index}`, dinner]));
    const week = (step: number) => {
      let value = 0;
      return suggestWeek(nextWeek(new Map()), {
        plan: new Map(),
        profiles: alike,
        today,
        random: () => (value = (value + step) % 1),
      }).map((meal) => meal.recipeId);
    };
    expect(week(0.37)).not.toEqual(week(0.61));
  });
});

describe("shuffleOptions", () => {
  // Next Wednesday, holding a suggested meal.
  const wednesday = new Date(2026, 9, 14);
  const shuffleProfiles = new Map<string, RecipeProfileAnswers>([
    ...profiles,
    ["spaghetti", { ...dinner, base: "pasta", protein: "beef" }],
    ["pizza", { ...dinner, base: "bread", protein: "pork", isTreat: true }],
    ["falafel", { ...dinner, protein: "vegetarian" }],
    ["omelette", { ...dinner, protein: "vegetarian", effort: "quick" }],
  ]);

  function optionsFor(recipeId: string, extra: [string, PlannedMealRow][] = []) {
    const [key, meal] = planned(wednesday, recipeId);
    const plan: MealPlan = new Map([...extra, [key, { ...meal, suggestionId: "s1" }]]);
    return shuffleOptions(nextWeek(plan), wednesday, { plan, profiles: shuffleProfiles, today });
  }

  test("goes through every dinner on the same base, round to the meal itself", () => {
    const options = optionsFor("carbonara");
    expect(options.toSorted()).toEqual(["carbonara", "lasagna", "spaghetti"]);
    let current = "carbonara";
    const seen = Array.from({ length: options.length }, () => {
      current = nextShuffle(options, current) ?? "";
      return current;
    });
    expect(seen.at(-1)).toBe("carbonara");
    expect(new Set(seen).size).toBe(options.length);
  });

  test("puts the best fit first: a quick dish before an involved one on a weeknight", () => {
    const options = optionsFor("carbonara");
    expect(options.indexOf("lasagna")).toBe(options.length - 1);
  });

  test("skips recipes planned within a week of the day", () => {
    const fiveDaysBefore = planned(new Date(2026, 9, 9), "spaghetti");
    const tenDaysBefore = planned(new Date(2026, 9, 4), "spaghetti");
    expect(optionsFor("carbonara", [fiveDaysBefore])).not.toContain("spaghetti");
    expect(optionsFor("carbonara", [tenDaysBefore])).toContain("spaghetti");
  });

  test("shuffles a treat through other treats, whatever their base", () => {
    expect(optionsFor("tacos").toSorted()).toEqual(["pizza", "tacos"]);
  });

  test("matches the catch-all base on protein", () => {
    expect(optionsFor("falafel").toSorted()).toEqual(["falafel", "omelette"]);
  });
});

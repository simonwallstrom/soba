import { describe, expect, test } from "bun:test";

import { dayKey } from "@client/features/meal-plan/weeks";
import type { DeclinedSuggestion, PlannedMealRow } from "@shared/meal-plan";

import { getPlannerWeeks } from "./-meal-plan";
import type { MealPlan } from "./-meal-plan";
import type { Profile } from "./-recipe-profile";
import { suggestWeek } from "./-suggest";

// Tuesday 6 October 2026; the week planned is the next one, Monday 12 to Sunday 18.
const today = new Date(2026, 9, 6);

const dinner: Profile = {
  isDinner: true,
  base: "other",
  protein: "other",
  effort: "normal",
  isTreat: false,
};

const profiles = new Map<string, Profile>([
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
      alternatives: [],
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

function suggest(plan: MealPlan, declined: DeclinedSuggestion[] = []) {
  return suggestWeek(nextWeek(plan), plan, profiles, declined, today);
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

  test("offers alternatives like the pick to shuffle through, starting with it", () => {
    for (const { recipeId, alternatives } of suggest(history)) {
      const pick = profiles.get(recipeId);
      expect(alternatives[0]).toBe(recipeId);
      for (const alternative of alternatives) {
        expect(profiles.get(alternative)?.base).toBe(pick?.base);
        expect(profiles.get(alternative)?.isTreat).toBe(pick?.isTreat);
      }
    }
  });

  test("suggests a recipe less on a weekday where it was removed", () => {
    const removed = fridays.map((date) => ({
      date: dayKey(date),
      recipeId: "tacos",
      kind: "removed" as const,
      declinedAt: today,
    }));
    const friday = suggest(history, removed).find((meal) => meal.date === "2026-10-16");
    expect(friday?.recipeId).not.toBe("tacos");
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
    const suggested = suggestWeek(nextWeek(plan), plan, withSpaghetti, [], today);
    const pasta = suggested.filter((meal) => withSpaghetti.get(meal.recipeId)?.base === "pasta");
    expect(pasta.length).toBeLessThanOrEqual(2);
  });
});

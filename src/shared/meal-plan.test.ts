import { describe, expect, test } from "bun:test";

import { mealHistory, withMealMoved, withMealsPlanned, withMealsUnplanned } from "./meal-plan";
import type { PlannedMealRow } from "./meal-plan";

const at = new Date(Date.UTC(2026, 9, 6));

function meal(date: string, recipeId: string): PlannedMealRow {
  return { date, recipeId, plannedBy: "u1", plannedAt: at };
}

const days = (plan: readonly PlannedMealRow[]) =>
  plan
    .map(({ date, recipeId }) => `${date} ${recipeId}`)
    .toSorted((left, right) => left.localeCompare(right));

describe("meal plan changes", () => {
  test("a day holds one dinner, and the last plan wins", () => {
    const plan = withMealsPlanned(
      [meal("2026-10-12", "r1")],
      [meal("2026-10-12", "r2"), meal("2026-10-13", "r3")],
    );
    expect(plan).toEqual([meal("2026-10-12", "r2"), meal("2026-10-13", "r3")]);
  });

  test("planning what is already planned changes nothing", () => {
    const plan = [meal("2026-10-12", "r1")];
    expect(withMealsPlanned(plan, plan)).toEqual(plan);
  });

  test("unplanning clears the days", () => {
    const plan = [meal("2026-10-12", "r1"), meal("2026-10-13", "r2"), meal("2026-10-14", "r3")];
    expect(days(withMealsUnplanned(plan, ["2026-10-12", "2026-10-14"]))).toEqual(["2026-10-13 r2"]);
  });

  test("moving a meal to an open day leaves its first day open", () => {
    expect(withMealMoved([meal("2026-10-12", "r1")], "2026-10-12", "2026-10-14")).toEqual([
      meal("2026-10-14", "r1"),
    ]);
  });

  test("moving a meal onto a planned day swaps the two", () => {
    const plan = [meal("2026-10-12", "r1"), meal("2026-10-14", "r2")];
    expect(days(withMealMoved(plan, "2026-10-12", "2026-10-14"))).toEqual([
      "2026-10-12 r2",
      "2026-10-14 r1",
    ]);
  });

  test("moving from an open day changes nothing", () => {
    const plan = [meal("2026-10-14", "r2")];
    expect(withMealMoved(plan, "2026-10-12", "2026-10-14")).toEqual(plan);
  });
});

describe("mealHistory", () => {
  test("splits each recipe's days into the last one eaten and the next one planned", () => {
    const { lastEaten, nextPlanned } = mealHistory(
      [
        meal("2026-09-20", "r1"),
        meal("2026-10-01", "r1"),
        meal("2026-10-20", "r1"),
        meal("2026-10-16", "r1"),
        meal("2026-10-15", "r2"),
        meal("2026-10-16", "r3"),
      ],
      "2026-10-16",
    );
    expect(Object.fromEntries(lastEaten)).toEqual({ r1: "2026-10-01", r2: "2026-10-15" });
    expect(Object.fromEntries(nextPlanned)).toEqual({ r1: "2026-10-16", r3: "2026-10-16" });
  });
});

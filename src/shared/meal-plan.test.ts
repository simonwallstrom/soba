import { beforeEach, describe, expect, test } from "bun:test";

import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { createStorePromise, queryDb } from "@livestore/livestore";
import type { Store } from "@livestore/livestore";

import { mealMoved, mealPlanned, mealUnplanned, plannedMeals } from "./meal-plan";
import { recipeSchema } from "./recipes";

let store: Store<typeof recipeSchema>;

beforeEach(async () => {
  store = await createStorePromise({
    schema: recipeSchema,
    adapter: makeInMemoryAdapter(),
    storeId: "test",
  });
});

const at = new Date(Date.UTC(2026, 9, 6));

function plan(date: string, recipeId: string, suggestion?: { id: string }) {
  return mealPlanned({
    date,
    recipeId,
    ...(suggestion ? { suggestion } : {}),
    plannedBy: "u1",
    plannedAt: at,
  });
}

function move(from: string, to: string) {
  return mealMoved({ from, to, movedBy: "u1", movedAt: at });
}

const meals = () => [...store.query(queryDb(plannedMeals.select()))];

describe("meal plan events", () => {
  test("a day holds one dinner, and the last plan wins", () => {
    store.commit(plan("2026-10-12", "r1"), plan("2026-10-12", "r2", { id: "s1" }));
    expect(meals()).toEqual([
      {
        date: "2026-10-12",
        recipeId: "r2",
        suggestionId: "s1",
        plannedBy: "u1",
        plannedAt: at,
      },
    ]);
  });

  test("unplanning clears the day", () => {
    store.commit(
      plan("2026-10-12", "r1"),
      mealUnplanned({ date: "2026-10-12", unplannedBy: "u1", unplannedAt: at }),
    );
    expect(meals()).toEqual([]);
  });

  test("moving a meal to an open day leaves its first day open", () => {
    store.commit(plan("2026-10-12", "r1", { id: "s1" }), move("2026-10-12", "2026-10-14"));
    expect(meals()).toEqual([
      {
        date: "2026-10-14",
        recipeId: "r1",
        suggestionId: "s1",
        plannedBy: "u1",
        plannedAt: at,
      },
    ]);
  });

  test("moving a meal onto a planned day swaps the two", () => {
    store.commit(
      plan("2026-10-12", "r1"),
      plan("2026-10-14", "r2"),
      move("2026-10-12", "2026-10-14"),
    );
    expect(meals().map(({ date, recipeId }) => [date, recipeId])).toEqual(
      expect.arrayContaining([
        ["2026-10-12", "r2"],
        ["2026-10-14", "r1"],
      ]),
    );
    expect(meals()).toHaveLength(2);
  });

  test("moving from an open day changes nothing", () => {
    store.commit(plan("2026-10-14", "r2"), move("2026-10-12", "2026-10-14"));
    expect(meals().map(({ date, recipeId }) => [date, recipeId])).toEqual([["2026-10-14", "r2"]]);
  });
});

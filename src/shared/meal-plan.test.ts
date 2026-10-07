import { beforeEach, describe, expect, test } from "bun:test";

import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { createStorePromise, queryDb } from "@livestore/livestore";
import type { Store } from "@livestore/livestore";

import {
  declinedSuggestions,
  mealMoved,
  mealPlanned,
  mealSuggestionDeclined,
  mealUnplanned,
  plannedMeals,
} from "./meal-plan";
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

function plan(date: string, recipeId: string, suggestion?: { id: string; alternatives: string[] }) {
  return mealPlanned({
    date,
    recipeId,
    ...(suggestion ? { suggestion } : {}),
    plannedBy: "u1",
    plannedAt: at,
  });
}

function decline(recipeId: string) {
  return mealSuggestionDeclined({
    date: "2026-10-12",
    recipeId,
    declinedBy: "u1",
    declinedAt: at,
  });
}

function move(from: string, to: string) {
  return mealMoved({ from, to, movedBy: "u1", movedAt: at });
}

const meals = () => [...store.query(queryDb(plannedMeals.select()))];
const declines = () => [...store.query(queryDb(declinedSuggestions.select()))];

describe("meal plan events", () => {
  test("a day holds one dinner, and the last plan wins", () => {
    store.commit(
      plan("2026-10-12", "r1"),
      plan("2026-10-12", "r2", { id: "s1", alternatives: ["r2", "r3"] }),
    );
    expect(meals()).toEqual([
      {
        date: "2026-10-12",
        recipeId: "r2",
        suggestionId: "s1",
        alternatives: ["r2", "r3"],
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
    store.commit(
      plan("2026-10-12", "r1", { id: "s1", alternatives: ["r1", "r2"] }),
      move("2026-10-12", "2026-10-14"),
    );
    expect(meals()).toEqual([
      {
        date: "2026-10-14",
        recipeId: "r1",
        suggestionId: "s1",
        alternatives: ["r1", "r2"],
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

  test("planning a declined recipe on its day again takes the decline back", () => {
    store.commit(decline("r1"), decline("r2"), plan("2026-10-12", "r1"));
    expect(declines().map((row) => row.recipeId)).toEqual(["r2"]);
  });
});

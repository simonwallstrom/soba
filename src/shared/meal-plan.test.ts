import { beforeEach, describe, expect, test } from "bun:test";

import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { createStorePromise, queryDb } from "@livestore/livestore";
import type { Store } from "@livestore/livestore";

import {
  declinedSuggestions,
  mealPlanned,
  mealSuggestionDeclined,
  mealUnplanned,
  plannedMeals,
  recipeProfiled,
  recipeProfiles,
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
    kind: "removed",
    declinedBy: "u1",
    declinedAt: at,
  });
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

  test("planning a declined recipe on its day again takes the decline back", () => {
    store.commit(decline("r1"), decline("r2"), plan("2026-10-12", "r1"));
    expect(declines().map((row) => row.recipeId)).toEqual(["r2"]);
  });

  test("a recipe's profile is replaced by a newer one", () => {
    const profile = {
      recipeId: "r1",
      isDinner: true,
      base: "rice",
      protein: "fish",
      isTreat: false,
      profiledAt: at,
    } as const;
    store.commit(
      recipeProfiled({ ...profile, effort: "normal" }),
      recipeProfiled({ ...profile, effort: "quick" }),
    );
    expect(store.query(queryDb(recipeProfiles.select())).map((row) => row.effort)).toEqual([
      "quick",
    ]);
  });
});

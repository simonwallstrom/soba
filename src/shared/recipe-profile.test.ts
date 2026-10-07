import { beforeEach, describe, expect, test } from "bun:test";

import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { createStorePromise, queryDb } from "@livestore/livestore";
import type { Store } from "@livestore/livestore";

import {
  recipeProfiled,
  recipeProfiles,
  recipeProfileSource,
  recipeProfileSourceHash,
} from "./recipe-profile";
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

describe("recipe profiles", () => {
  test("a recipe's profile is replaced by a newer one", () => {
    const profile = {
      recipeId: "r1",
      isDinner: true,
      base: "rice",
      protein: "fish",
      isTreat: false,
      version: 1,
      sourceHash: "0",
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

describe("recipeProfileSourceHash", () => {
  const recipe = {
    title: "Pasta",
    description: null,
    ingredients: [{ heading: "Sauce", items: ["Tomatoes"] }],
    instructions: [{ items: ["Cook"] }],
  };

  test("ignores the order of a section's keys", () => {
    const reordered = { ...recipe, ingredients: [{ items: ["Tomatoes"], heading: "Sauce" }] };
    expect(recipeProfileSourceHash(recipeProfileSource(reordered))).toBe(
      recipeProfileSourceHash(recipeProfileSource(recipe)),
    );
  });

  test("changes when what a profile is read from changes", () => {
    const edited = { ...recipe, instructions: [{ items: ["Cook slowly"] }] };
    expect(recipeProfileSourceHash(recipeProfileSource(edited))).not.toBe(
      recipeProfileSourceHash(recipeProfileSource(recipe)),
    );
  });
});

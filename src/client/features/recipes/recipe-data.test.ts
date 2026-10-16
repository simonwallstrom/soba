import { expect, test } from "bun:test";

import * as v from "valibot";

import { storedCollection } from "./recipe-data";
import type { RecipeCollection } from "./recipe-data";

const at = new Date("2026-10-13T08:00:00.000Z");

const collection: RecipeCollection = {
  recipes: [
    {
      id: "r1",
      title: "Soba",
      description: null,
      servings: 2,
      imageUrl: null,
      sourceUrl: null,
      ingredients: [{ heading: "Sauce", items: ["Soy"] }, { items: ["Soba"] }],
      instructions: [],
      tagIds: ["t1"],
      createdBy: "u1",
      updatedBy: "u1",
      createdAt: at,
      updatedAt: at,
    },
  ],
  tags: [{ id: "t1", name: "Quick", createdAt: at }],
  favoriteIds: ["r1"],
};

test("the copy kept in the browser reads back as it was saved", () => {
  const stored: unknown = JSON.parse(JSON.stringify(collection));
  expect(v.parse(storedCollection, stored)).toEqual(collection);
});

test("a copy saved in another shape is dropped", () => {
  const stored: unknown = JSON.parse(JSON.stringify({ ...collection, favoriteIds: undefined }));
  expect(v.safeParse(storedCollection, stored).success).toBe(false);
});

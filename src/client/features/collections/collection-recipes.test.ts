import { describe, expect, test } from "bun:test";

import type { Recipe } from "@shared/recipes";

import { collectionCoverUrl, groupRecipesByCollection } from "./collection-recipes";

const day = (date: number) => new Date(Date.UTC(2026, 9, date));

function recipe(id: string, imageUrl: string | null = null): Recipe {
  return {
    id,
    title: id,
    description: null,
    servings: null,
    imageUrl,
    ingredients: [],
    instructions: [],
    createdBy: "u1",
    updatedBy: "u1",
    createdAt: day(1),
    updatedAt: day(1),
    deletedAt: null,
  };
}

function link(collectionId: string, recipeId: string, date: number) {
  return { collectionId, recipeId, addedBy: "u1", addedAt: day(date) };
}

describe("groupRecipesByCollection", () => {
  test("lists each collection's recipes newest added first", () => {
    const grouped = groupRecipesByCollection(
      [link("c1", "a", 1), link("c1", "b", 3), link("c2", "a", 2)],
      [recipe("a"), recipe("b")],
    );
    expect(grouped.get("c1")?.map(({ id }) => id)).toEqual(["b", "a"]);
    expect(grouped.get("c2")?.map(({ id }) => id)).toEqual(["a"]);
  });

  test("drops recipes that are no longer listed", () => {
    const grouped = groupRecipesByCollection([link("c1", "gone", 1)], [recipe("a")]);
    expect(grouped.get("c1")).toBeUndefined();
  });
});

describe("collectionCoverUrl", () => {
  test("uses the newest added recipe with a photo", () => {
    expect(collectionCoverUrl([recipe("a"), recipe("b", "b.jpg"), recipe("c", "c.jpg")])).toBe(
      "b.jpg",
    );
  });

  test("is empty without photos", () => {
    expect(collectionCoverUrl([recipe("a")])).toBeNull();
  });
});

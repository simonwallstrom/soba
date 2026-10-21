import { describe, expect, test } from "bun:test";

import type { Recipe } from "@shared/recipes";

import {
  createRecipeDraft,
  draftFields,
  hasDraftChanges,
  hasDraftContent,
  recipeToDraft,
} from "./recipe-draft";
import { createRow } from "./recipe-rows";

describe("hasDraftContent", () => {
  test("is false for a new draft and for whitespace only", () => {
    const draft = createRecipeDraft();
    expect(hasDraftContent(draft)).toBe(false);
    expect(hasDraftContent({ ...draft, title: "  ", ingredients: [createRow("item", " ")] })).toBe(
      false,
    );
  });

  test("is true once anything is written or chosen", () => {
    const draft = createRecipeDraft();
    expect(hasDraftContent({ ...draft, instructions: [createRow("item", "Boil")] })).toBe(true);
    expect(hasDraftContent({ ...draft, servings: 2 })).toBe(true);
    expect(hasDraftContent({ ...draft, tagIds: ["tag-1"] })).toBe(true);
  });
});

describe("draftFields", () => {
  test("trims text, drops blanks, and leaves out empty optional fields", () => {
    const draft = {
      ...createRecipeDraft(),
      title: " Miso soba ",
      description: "  ",
      ingredients: [createRow("item", " Soba "), createRow("item", "")],
    };
    expect(draftFields(draft)).toEqual({
      title: "Miso soba",
      ingredients: [{ items: ["Soba"] }],
      instructions: [],
      tagIds: [],
      newTags: [],
    });
  });

  test("saves only the new tags the recipe still uses", () => {
    const draft = {
      ...createRecipeDraft(),
      title: "Soba",
      servings: 2,
      tagIds: ["tag-old", "tag-new"],
      newTags: [
        { id: "tag-new", name: "Noodles" },
        { id: "tag-dropped", name: "Dropped" },
      ],
    };
    expect(draftFields(draft)).toMatchObject({
      servings: 2,
      tagIds: ["tag-old", "tag-new"],
      newTags: [{ id: "tag-new", name: "Noodles" }],
    });
  });
});

const recipe: Recipe = {
  id: "recipe-1",
  title: "Soba",
  description: null,
  servings: 2,
  imageUrl: null,
  sourceUrl: null,
  shareToken: null,
  isShared: false,
  ingredients: [{ heading: "Broth", items: ["Dashi"] }],
  instructions: [],
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: new Date("2026-10-01T12:00:00Z"),
  updatedAt: new Date("2026-10-01T12:00:00Z"),
  tagIds: ["tag-1", "tag-2"],
};

describe("hasDraftChanges", () => {
  test("ignores spaces, blank lines and the order of tags", () => {
    const original = recipeToDraft(recipe);
    const draft = {
      ...original,
      title: " Soba ",
      tagIds: ["tag-2", "tag-1"],
      ingredients: [...original.ingredients, createRow("item", " ")],
    };
    expect(hasDraftChanges(draft, original)).toBe(false);
  });

  test("notices a changed line or detail", () => {
    const original = recipeToDraft(recipe);
    expect(
      hasDraftChanges({ ...original, instructions: [createRow("item", "Boil")] }, original),
    ).toBe(true);
    expect(hasDraftChanges({ ...original, servings: null }, original)).toBe(true);
  });
});

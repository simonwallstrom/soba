import { describe, expect, test } from "bun:test";

import type { Recipe } from "@shared/recipes";

import {
  createRecipeDraft,
  hasDraftChanges,
  hasDraftContent,
  recipeDraftEvents,
  recipeEditEvents,
  recipeToDraft,
} from "./recipe-draft";
import { createRow } from "./recipe-rows";

const meta = { id: "recipe-1", createdBy: "user-1", createdAt: new Date("2026-10-01T12:00:00Z") };

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

describe("recipeDraftEvents", () => {
  test("trims text, drops blanks, and leaves out empty optional fields", () => {
    const draft = {
      ...createRecipeDraft(),
      title: " Miso soba ",
      description: "  ",
      ingredients: [createRow("item", " Soba "), createRow("item", "")],
    };
    expect(recipeDraftEvents(draft, meta).map(({ name, args }) => ({ name, args }))).toEqual([
      {
        name: "v1.RecipeCreated",
        args: {
          ...meta,
          title: "Miso soba",
          ingredients: [{ items: ["Soba"] }],
          instructions: [],
          tagIds: [],
        },
      },
    ]);
  });

  test("creates only the new tags the recipe still uses, before the recipe", () => {
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
    const events = recipeDraftEvents(draft, meta);
    expect(events.map(({ name, args }) => [name, args.id])).toEqual([
      ["v1.TagCreated", "tag-new"],
      ["v1.RecipeCreated", "recipe-1"],
    ]);
    expect(events[1]?.args).toMatchObject({ servings: 2, tagIds: ["tag-old", "tag-new"] });
  });
});

const recipe: Recipe = {
  id: "recipe-1",
  title: "Soba",
  description: null,
  servings: 2,
  imageUrl: null,
  ingredients: [{ heading: "Broth", items: ["Dashi"] }],
  instructions: [],
  createdBy: "user-1",
  updatedBy: "user-1",
  createdAt: new Date("2026-10-01T12:00:00Z"),
  updatedAt: new Date("2026-10-01T12:00:00Z"),
  deletedAt: null,
};

describe("hasDraftChanges", () => {
  test("ignores spaces, blank lines and the order of tags", () => {
    const original = recipeToDraft(recipe, ["tag-1", "tag-2"]);
    const draft = {
      ...original,
      title: " Soba ",
      tagIds: ["tag-2", "tag-1"],
      ingredients: [...original.ingredients, createRow("item", " ")],
    };
    expect(hasDraftChanges(draft, original)).toBe(false);
  });

  test("notices a changed line or detail", () => {
    const original = recipeToDraft(recipe, []);
    expect(
      hasDraftChanges({ ...original, instructions: [createRow("item", "Boil")] }, original),
    ).toBe(true);
    expect(hasDraftChanges({ ...original, servings: null }, original)).toBe(true);
  });
});

describe("recipeEditEvents", () => {
  test("saves the whole recipe after any new tags it uses", () => {
    const updatedAt = new Date("2026-10-02T12:00:00Z");
    const draft = {
      ...recipeToDraft(recipe, ["tag-old"]),
      tagIds: ["tag-old", "tag-new"],
      newTags: [{ id: "tag-new", name: "Noodles" }],
    };
    expect(
      recipeEditEvents(draft, { id: "recipe-1", updatedBy: "user-2", updatedAt }).map(
        ({ name, args }) => ({ name, args }),
      ),
    ).toEqual([
      { name: "v1.TagCreated", args: { id: "tag-new", name: "Noodles", createdAt: updatedAt } },
      {
        name: "v1.RecipeUpdated",
        args: {
          id: "recipe-1",
          title: "Soba",
          servings: 2,
          ingredients: [{ heading: "Broth", items: ["Dashi"] }],
          instructions: [],
          tagIds: ["tag-old", "tag-new"],
          updatedBy: "user-2",
          updatedAt,
        },
      },
    ]);
  });
});

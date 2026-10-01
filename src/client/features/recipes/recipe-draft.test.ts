import { describe, expect, test } from "bun:test";

import { createRecipeDraft, hasDraftContent, recipeDraftEvents } from "./recipe-draft";
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

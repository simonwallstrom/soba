import { describe, expect, test } from "bun:test";

import { recipeProfileSource, recipeProfileSourceHash } from "./recipe-profile";

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

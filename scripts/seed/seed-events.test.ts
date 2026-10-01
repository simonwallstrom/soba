import { describe, expect, test } from "bun:test";

import { sampleRecipes } from "./sample-recipes";
import { sampleRecipeEvents } from "./seed-events";

describe("sampleRecipeEvents", () => {
  const events = sampleRecipeEvents("user-1");
  const tags = events.filter((event) => event.name === "v1.TagCreated");
  const recipes = events.filter((event) => event.name === "v1.RecipeCreated");

  test("creates each tag once, before the recipes that use it", () => {
    const names = new Set(sampleRecipes.flatMap((recipe) => recipe.tags));
    expect(tags.map((event) => event.args.name).toSorted()).toEqual([...names].toSorted());
    expect(events.slice(0, tags.length)).toEqual(tags);
  });

  test("adds every recipe for the user, linked to its own tags", () => {
    const tagNames = new Map(tags.map(({ args }) => [args.id, args.name]));
    expect(recipes).toHaveLength(sampleRecipes.length);
    for (const [index, { args }] of recipes.entries()) {
      if (!("createdBy" in args)) throw new Error("Expected a recipe event");
      expect(args.createdBy).toBe("user-1");
      expect(args.tagIds?.map((id) => tagNames.get(id))).toEqual([...sampleRecipes[index]!.tags]);
    }
  });
});

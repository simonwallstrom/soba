import { describe, expect, test } from "bun:test";

import { sampleRecipes } from "./sample-recipes";
import { sampleRecipeEvents } from "./seed-events";

const events = sampleRecipeEvents("user-1");

describe("sampleRecipeEvents", () => {
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

  test("profiles every recipe for meal suggestions", () => {
    const profiled = events.flatMap((event) =>
      event.name === "v1.RecipeProfiled" ? [event.args.recipeId] : [],
    );
    expect(profiled.toSorted()).toEqual(recipes.map(({ args }) => args.id).toSorted());
  });

  test("plans dinners of sample recipes in the weeks before this one", () => {
    const now = new Date(2026, 9, 7);
    const meals = sampleRecipeEvents("user-1", now).flatMap((event) =>
      event.name === "v1.MealPlanned" ? [event.args] : [],
    );
    expect(meals.length).toBeGreaterThan(20);
    for (const meal of meals) {
      expect(meal.date >= "2026-09-07" && meal.date < "2026-10-05").toBe(true);
    }
  });
});

import { describe, expect, test } from "bun:test";

import {
  recipeProfileSource,
  recipeProfileSourceHash,
  recipeProfileVersion,
} from "@shared/recipe-profile";

import { sampleRecipes } from "./sample-recipes";
import { sampleHouseholdData } from "./seed-data";

const { tags, recipes } = sampleHouseholdData("user-1");

describe("sampleHouseholdData", () => {
  test("creates each tag once", () => {
    const names = new Set(sampleRecipes.flatMap((recipe) => recipe.tags));
    expect(tags.map((tag) => tag.name).toSorted()).toEqual([...names].toSorted());
  });

  test("adds every recipe for the user, linked to its own tags", () => {
    const tagNames = new Map(tags.map((tag) => [tag.id, tag.name]));
    expect(recipes).toHaveLength(sampleRecipes.length);
    for (const [index, recipe] of recipes.entries()) {
      expect(recipe.createdBy).toBe("user-1");
      expect(recipe.tagIds.map((id) => tagNames.get(id))).toEqual([...sampleRecipes[index]!.tags]);
    }
  });

  // Otherwise the app reads every sample recipe with a model as soon as it opens.
  test("profiles every recipe as the app would read it", () => {
    for (const recipe of recipes) {
      expect(recipe.profile.version).toBe(recipeProfileVersion);
      expect(recipe.profile.sourceHash).toBe(recipeProfileSourceHash(recipeProfileSource(recipe)));
    }
  });

  test("plans dinners of sample recipes in the weeks before this one", () => {
    const now = new Date(2026, 9, 7);
    const sample = sampleHouseholdData("user-1", now);
    const recipeIds = new Set(sample.recipes.map((recipe) => recipe.id));
    expect(sample.meals.length).toBeGreaterThan(20);
    for (const meal of sample.meals) {
      expect(meal.date >= "2026-09-07" && meal.date < "2026-10-05").toBe(true);
      expect(recipeIds.has(meal.recipeId)).toBe(true);
    }
  });
});

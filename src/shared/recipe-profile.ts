import type { RecipeSection } from "./recipes";

// What meal suggestions know about each recipe: a profile a model reads from the recipe in the
// background. See docs/ai-and-meal-planning.md.

export const recipeBases = ["potato", "rice", "pasta", "bread", "other"] as const;
export type RecipeBase = (typeof recipeBases)[number];
export const recipeProteins = ["fish", "chicken", "beef", "pork", "vegetarian", "other"] as const;
export type RecipeProtein = (typeof recipeProteins)[number];
export const recipeEfforts = ["quick", "normal", "involved"] as const;
export type RecipeEffort = (typeof recipeEfforts)[number];

// What meal suggestions use from a profile, read from the recipe's title, ingredients, and steps.
// Never shown, and separate from tags, which stay the household's own.
export type RecipeProfileAnswers = {
  // Whether it's a dinner at all, not a dessert, bread, or breakfast.
  isDinner: boolean;
  base: RecipeBase;
  protein: RecipeProtein;
  effort: RecipeEffort;
  // Fun food a family saves for some days, like tacos or pizza.
  isTreat: boolean;
};

// The questions a profile answered, and a hash of what it was read from; a profile is read again
// when either changes.
export type RecipeProfile = RecipeProfileAnswers & { version: number; sourceHash: string };

// Bump when the profile questions change (src/server/recipe-profile/clef.ts), so every recipe is
// read again with the new ones.
// v2: clearer dinner and treat questions, with their own thresholds.
export const recipeProfileVersion = 2;

// What a recipe's profile is read from. Tags stay out: they're the household's own words.
export function recipeProfileSource(recipe: {
  title: string;
  description?: string | null | undefined;
  ingredients: readonly RecipeSection[];
  instructions: readonly RecipeSection[];
}) {
  return {
    title: recipe.title,
    description: recipe.description ?? "",
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  };
}

function sectionValues(sections: readonly RecipeSection[]) {
  return sections.map(({ heading, items }) => [heading ?? "", items]);
}

// A short fingerprint of a profile's source (FNV-1a), to notice when the recipe changed. Built
// from values only, so the order of an object's keys doesn't matter.
export function recipeProfileSourceHash(source: ReturnType<typeof recipeProfileSource>) {
  const text = JSON.stringify([
    source.title,
    source.description,
    sectionValues(source.ingredients),
    sectionValues(source.instructions),
  ]);
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

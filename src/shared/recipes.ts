import type { RecipeProfile } from "./recipe-profile";

// Ingredients and instructions: plain-text lines, optionally grouped under headings.
export type RecipeSection = { heading?: string | undefined; items: string[] };

// What the recipe form and imports allow. The API accepts more, so tightening a limit later
// never rejects a recipe saved under an older one.
export const recipeTitleMaxLength = 60;
export const recipeDescriptionMaxLength = 160;

export type Recipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  imageUrl: string | null;
  // The page an imported recipe came from.
  sourceUrl: string | null;
  ingredients: RecipeSection[];
  instructions: RecipeSection[];
  tagIds: string[];
  // What meal suggestions know about the recipe, once a model has read it.
  profile: RecipeProfile | null;
  // User IDs; names and photos come from the household's members.
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

// Tags belong to the household, so renaming one updates every recipe that uses it.
export type Tag = { id: string; name: string; createdAt: Date };

export const recipeViews = ["list", "grid"] as const;
export type RecipeView = (typeof recipeViews)[number];

export const recipeDetails = ["author", "tags"] as const;
export type RecipeDetail = (typeof recipeDetails)[number];

export const recipeSorts = ["name", "created", "updated"] as const;
export type RecipeSort = (typeof recipeSorts)[number];

// Where the Worker serves a household's uploaded photo.
export function recipePhotoUrl(photoId: string) {
  return `/api/photos/${photoId}`;
}

// How tag names are stored and shown: single spaces and a capital first letter, the rest as
// typed so "BBQ" stays. The tag picker matches names regardless of case.
export function normalizeTagName(name: string) {
  return name
    .trim()
    .replace(/\s+/gu, " ")
    .replace(/^\p{Ll}/u, (first) => first.toLocaleUpperCase("sv-SE"));
}

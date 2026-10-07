import { queryDb } from "@livestore/livestore";
import { recipeProfiles } from "@shared/recipe-profile";
import { favorites, recipeListSettings, recipes, recipeTags, tags } from "@shared/recipes";

export const recipes$ = queryDb(recipes.where({ deletedAt: null }), { label: "recipes" });

export const tags$ = queryDb(tags.where({ deletedAt: null }), { label: "tags" });

export const recipeTags$ = queryDb(recipeTags.select(), { label: "recipeTags" });

export function recipe$(recipeId: string) {
  return queryDb(recipes.where({ id: recipeId, deletedAt: null }).first(), {
    label: "recipe",
    deps: [recipeId],
  });
}

// Newest first.
export function favorites$(userId: string) {
  return queryDb(favorites.where({ userId }).orderBy("favoritedAt", "desc"), {
    label: "favorites",
    deps: [userId],
  });
}

export const recipeListSettings$ = queryDb(recipeListSettings.get(), {
  label: "recipeListSettings",
});

// What meal suggestions know about each recipe; see recipe-profile.ts.
export const recipeProfiles$ = queryDb(recipeProfiles.select(), { label: "recipeProfiles" });

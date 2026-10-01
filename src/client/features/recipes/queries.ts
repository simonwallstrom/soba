import { queryDb } from "@livestore/livestore";
import { recipeListSettings, recipes, recipeTags, tags } from "@shared/recipes";

export const recipes$ = queryDb(recipes.where({ deletedAt: null }), { label: "recipes" });

export const tags$ = queryDb(tags.where({ deletedAt: null }), { label: "tags" });

export const recipeTags$ = queryDb(recipeTags.select(), { label: "recipeTags" });

export function recipe$(recipeId: string) {
  return queryDb(recipes.where({ id: recipeId, deletedAt: null }).first(), {
    label: "recipe",
    deps: [recipeId],
  });
}

export const recipeListSettings$ = queryDb(recipeListSettings.get(), {
  label: "recipeListSettings",
});

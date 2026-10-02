import type { CollectionRecipe, Recipe } from "@shared/recipes";

// Each collection's live recipes, newest added first. Links to deleted recipes are dropped.
export function groupRecipesByCollection(
  links: readonly CollectionRecipe[],
  recipes: readonly Recipe[],
) {
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const recipesByCollection = new Map<string, Recipe[]>();
  const newestFirst = links.toSorted(
    (left, right) => right.addedAt.getTime() - left.addedAt.getTime(),
  );
  for (const { collectionId, recipeId } of newestFirst) {
    const recipe = recipesById.get(recipeId);
    if (!recipe) continue;
    const collectionRecipes = recipesByCollection.get(collectionId);
    if (collectionRecipes) collectionRecipes.push(recipe);
    else recipesByCollection.set(collectionId, [recipe]);
  }
  return recipesByCollection;
}

// A collection's cover is the photo of its newest added recipe that has one.
export function collectionCoverUrl(recipes: readonly Recipe[]) {
  return recipes.find((recipe) => recipe.imageUrl)?.imageUrl ?? null;
}

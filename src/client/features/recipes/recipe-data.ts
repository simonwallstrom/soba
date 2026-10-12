import { createHouseholdData } from "@client/features/household/data";
import { api } from "@client/lib/api";
import { recipePhotoUrl } from "@shared/recipes";
import type { Recipe, RecipeSection, Tag } from "@shared/recipes";

// The household's recipes and tags, and the signed-in member's favorite recipe IDs, newest first.
export type RecipeCollection = { recipes: Recipe[]; tags: Tag[]; favoriteIds: string[] };

export const recipeData = createHouseholdData<RecipeCollection>(["recipes"], async (signal) => {
  const response = await api.recipes.$get({}, { init: { signal, cache: "no-store" } });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const { recipes, tags, favoriteIds } = await response.json();
  return {
    recipes: recipes.map((recipe) => ({
      ...recipe,
      createdAt: new Date(recipe.createdAt),
      updatedAt: new Date(recipe.updatedAt),
    })),
    tags: tags.map((tag) => ({ ...tag, createdAt: new Date(tag.createdAt) })),
    favoriteIds,
  };
});

export function useRecipes() {
  return recipeData.useData().recipes;
}

export function useTags() {
  return recipeData.useData().tags;
}

// Undefined for a wrong link, or a recipe deleted while open, perhaps on another device.
export function useRecipe(recipeId: string) {
  return useRecipes().find((recipe) => recipe.id === recipeId);
}

// The favorite recipe IDs, newest first, and a toggle for one recipe.
export function useFavorites() {
  const { favoriteIds: recipeIds } = recipeData.useData();
  const favoriteIds = new Set(recipeIds);

  function toggleFavorite(recipeId: string) {
    const isFavorite = !favoriteIds.has(recipeId);
    void recipeData.save(
      (data) => {
        const others = data.favoriteIds.filter((id) => id !== recipeId);
        return { ...data, favoriteIds: isFavorite ? [recipeId, ...others] : others };
      },
      () =>
        isFavorite
          ? api.recipes[":id"].favorite.$put({ param: { id: recipeId } })
          : api.recipes[":id"].favorite.$delete({ param: { id: recipeId } }),
    );
  }

  return { favoriteIds, recipeIds, toggleFavorite };
}

// What the recipe form saves, with empty optional fields left out. `newTags` are tags made
// while writing, saved with the recipe.
export type RecipeFields = {
  title: string;
  description?: string;
  servings?: number;
  ingredients: RecipeSection[];
  instructions: RecipeSection[];
  tagIds: string[];
  newTags: { id: string; name: string }[];
};

function withNewTags(tags: Tag[], newTags: RecipeFields["newTags"], createdAt: Date) {
  const known = new Set(tags.map((tag) => tag.id));
  return [
    ...tags,
    ...newTags.filter((tag) => !known.has(tag.id)).map((tag) => ({ ...tag, createdAt })),
  ];
}

function recipeContent(fields: RecipeFields) {
  const { newTags: _, description, servings, ...content } = fields;
  return { ...content, description: description ?? null, servings: servings ?? null };
}

// Saves a new recipe under an ID made here, so its page can open before the server answers.
export function createRecipe(
  fields: RecipeFields,
  { id, userId, photoId }: { id: string; userId: string; photoId: string | undefined },
) {
  const at = new Date();
  const recipe: Recipe = {
    id,
    ...recipeContent(fields),
    imageUrl: photoId ? recipePhotoUrl(photoId) : null,
    sourceUrl: null,
    profile: null,
    createdBy: userId,
    updatedBy: userId,
    createdAt: at,
    updatedAt: at,
  };
  return recipeData.save(
    (data) => ({
      ...data,
      tags: withNewTags(data.tags, fields.newTags, at),
      recipes: [...data.recipes.filter((other) => other.id !== id), recipe],
    }),
    () => api.recipes.$post({ json: { id, ...fields, ...(photoId ? { photoId } : {}) } }),
  );
}

// Replaces what the recipe form edits; the last save wins. An undefined photo keeps the
// recipe's own, and null removes it.
export function updateRecipe(
  fields: RecipeFields,
  { id, userId, photoId }: { id: string; userId: string; photoId: string | null | undefined },
) {
  const at = new Date();
  const photo = photoId === undefined ? {} : { imageUrl: photoId ? recipePhotoUrl(photoId) : null };
  return recipeData.save(
    (data) => ({
      ...data,
      tags: withNewTags(data.tags, fields.newTags, at),
      recipes: data.recipes.map((recipe) =>
        recipe.id === id
          ? { ...recipe, ...recipeContent(fields), ...photo, updatedBy: userId, updatedAt: at }
          : recipe,
      ),
    }),
    () =>
      api.recipes[":id"].$put({
        param: { id },
        json: { ...fields, ...(photoId === undefined ? {} : { photoId }) },
      }),
  );
}

// Takes the recipe's favorites and planned meals with it.
export function deleteRecipe(id: string) {
  return recipeData.save(
    (data) => ({
      ...data,
      recipes: data.recipes.filter((recipe) => recipe.id !== id),
      favoriteIds: data.favoriteIds.filter((recipeId) => recipeId !== id),
    }),
    () => api.recipes[":id"].$delete({ param: { id } }),
  );
}

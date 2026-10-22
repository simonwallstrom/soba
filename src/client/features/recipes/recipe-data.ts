import { toast } from "@client/components/ui/toast";
import { createHouseholdData } from "@client/features/household/data";
import { api } from "@client/lib/api";
import { normalizeTagName, recipePhotoUrl } from "@shared/recipes";
import type { Recipe, RecipeSection, Tag } from "@shared/recipes";
import * as v from "valibot";

// A recipe in Recently deleted: hidden everywhere else until it's restored, or deleted for good
// after `deletedRecipeDays`. `deletedBy` is a user ID.
export type DeletedRecipe = Recipe & { deletedAt: Date; deletedBy: string };

export const deletedRecipeDays = 30;

// The household's recipes and tags, and the signed-in member's favorite recipe IDs, newest first.
// Favorites keep deleted recipes, so a restore brings them back.
export type RecipeCollection = {
  recipes: Recipe[];
  deletedRecipes: DeletedRecipe[];
  tags: Tag[];
  favoriteIds: string[];
};

const storedDate = v.pipe(
  v.string(),
  v.isoTimestamp(),
  v.transform((value) => new Date(value)),
);
const storedSections = v.array(
  v.object({ heading: v.optional(v.string()), items: v.array(v.string()) }),
);

const storedRecipe = v.object({
  id: v.string(),
  title: v.string(),
  description: v.nullable(v.string()),
  servings: v.nullable(v.number()),
  imageUrl: v.nullable(v.string()),
  sourceUrl: v.nullable(v.string()),
  ingredients: storedSections,
  instructions: storedSections,
  tagIds: v.array(v.string()),
  // Copies stored before sharing existed.
  shareToken: v.optional(v.nullable(v.string()), null),
  isShared: v.optional(v.boolean(), false),
  createdBy: v.string(),
  updatedBy: v.string(),
  createdAt: storedDate,
  updatedAt: storedDate,
});

// The copy kept in this browser between visits, as JSON.
export const storedCollection = v.object({
  recipes: v.array(storedRecipe),
  // Copies stored before Recently deleted existed.
  deletedRecipes: v.optional(
    v.array(v.object({ ...storedRecipe.entries, deletedAt: storedDate, deletedBy: v.string() })),
    [],
  ),
  tags: v.array(v.object({ id: v.string(), name: v.string(), createdAt: storedDate })),
  favoriteIds: v.array(v.string()),
});

export const recipeData = createHouseholdData<RecipeCollection>({
  queryKey: ["recipes"],
  storageKey: "soba-recipes",
  schema: storedCollection,
  fetchData: fetchRecipes,
});

function withDates<T extends { createdAt: string; updatedAt: string }>(recipe: T) {
  return {
    ...recipe,
    createdAt: new Date(recipe.createdAt),
    updatedAt: new Date(recipe.updatedAt),
  };
}

async function fetchRecipes(signal: AbortSignal): Promise<RecipeCollection> {
  const response = await api.recipes.$get({}, { init: { signal, cache: "no-store" } });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const { recipes, deletedRecipes, tags, favoriteIds } = await response.json();
  return {
    recipes: recipes.map(withDates),
    deletedRecipes: deletedRecipes.map((recipe) => ({
      ...withDates(recipe),
      deletedAt: new Date(recipe.deletedAt),
    })),
    tags: tags.map((tag) => ({ ...tag, createdAt: new Date(tag.createdAt) })),
    favoriteIds,
  };
}

export function useRecipes() {
  return recipeData.useData().recipes;
}

// Most recently deleted first.
export function useDeletedRecipes() {
  return recipeData
    .useData()
    .deletedRecipes.toSorted((left, right) => right.deletedAt.getTime() - left.deletedAt.getTime());
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
    shareToken: null,
    isShared: false,
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

// Shares the recipe, or makes it private, keeping its link: sharing again brings the same one
// back. The first time, the token is made here, so the link shows at once.
export function setRecipeSharing(recipe: Pick<Recipe, "id" | "shareToken">, isShared: boolean) {
  const { id } = recipe;
  const shareToken = recipe.shareToken ?? makeShareToken();
  return recipeData.save(
    (data) => ({
      ...data,
      recipes: data.recipes.map((other) =>
        other.id === id ? { ...other, shareToken, isShared } : other,
      ),
    }),
    () =>
      isShared
        ? api.recipes[":id"].share.$put({ param: { id }, json: { token: shareToken } })
        : api.recipes[":id"].share.$delete({ param: { id } }),
  );
}

// Gives the recipe a new link, so the old one stops working, for a link shared too widely.
export function resetRecipeShareLink(id: string) {
  const shareToken = makeShareToken();
  return recipeData.save(
    (data) => ({
      ...data,
      recipes: data.recipes.map((other) =>
        other.id === id ? { ...other, shareToken, isShared: true } : other,
      ),
    }),
    () => api.recipes[":id"].share.reset.$post({ param: { id }, json: { token: shareToken } }),
  );
}

// 128 random bits, as base64url.
function makeShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

// Saves a copy of another household's shared recipe, under an ID made here, so it can open before
// the server answers. Until the next fetch, the copy shows the shared photo. Resolves to the
// copy's ID, which is an earlier copy's if the household saved it already, or null if it failed.
export async function saveSharedRecipe(
  shareToken: string,
  shared: Pick<
    Recipe,
    "title" | "description" | "servings" | "imageUrl" | "sourceUrl" | "ingredients" | "instructions"
  >,
  { id, userId }: { id: string; userId: string },
) {
  const at = new Date();
  const recipe: Recipe = {
    ...shared,
    id,
    tagIds: [],
    shareToken: null,
    isShared: false,
    createdBy: userId,
    updatedBy: userId,
    createdAt: at,
    updatedAt: at,
  };
  let savedId: string | null = null;
  const saved = await recipeData.save(
    (data) => ({
      ...data,
      recipes: [...data.recipes.filter((other) => other.id !== id), recipe],
    }),
    async () => {
      const response = await api.public.recipes[":token"].save.$post({
        param: { token: shareToken },
        json: { id },
      });
      if (response.ok) {
        const result = await response.json();
        if ("recipeId" in result) savedId = result.recipeId;
      }
      return response;
    },
  );
  return saved ? savedId : null;
}

// Moves the recipe to Recently deleted, hiding its planned meals, with a toast to take it back.
// Asking first would be slower, and still not undo a mistake.
export function deleteRecipe(recipe: Pick<Recipe, "id" | "title">, userId: string) {
  const { id } = recipe;
  const deletedAt = new Date();
  void recipeData.save(
    (data) => {
      const live = data.recipes.find((other) => other.id === id);
      if (!live) return data;
      return {
        ...data,
        recipes: data.recipes.filter((other) => other.id !== id),
        deletedRecipes: [
          ...data.deletedRecipes.filter((other) => other.id !== id),
          { ...live, deletedAt, deletedBy: userId },
        ],
      };
    },
    () => api.recipes[":id"].$delete({ param: { id } }),
  );
  toast.add({
    title: `Deleted ${recipe.title}`,
    description: `It’s in Recently deleted for ${deletedRecipeDays} days.`,
    actionProps: {
      children: "Undo",
      // Says so, as the recipe may come back somewhere out of view, like further down the list.
      onClick: () => {
        void restoreRecipe(id);
        toast.add({ title: `Restored ${recipe.title}` });
      },
    },
  });
}

// Brings the recipe back from Recently deleted, with its tags, favorites, and planned meals.
export function restoreRecipe(id: string) {
  return recipeData.save(
    (data) => {
      const deleted = data.deletedRecipes.find((other) => other.id === id);
      if (!deleted) return data;
      const { deletedAt: _, deletedBy: __, ...recipe } = deleted;
      return {
        ...data,
        recipes: [...data.recipes.filter((other) => other.id !== id), recipe],
        deletedRecipes: data.deletedRecipes.filter((other) => other.id !== id),
      };
    },
    () => api.recipes[":id"].restore.$post({ param: { id } }),
  );
}

// Deletes the recipe for good, with its photo, favorites, and planned meals.
export function deleteRecipePermanently(id: string) {
  return recipeData.save(
    (data) => ({
      ...data,
      recipes: data.recipes.filter((recipe) => recipe.id !== id),
      deletedRecipes: data.deletedRecipes.filter((recipe) => recipe.id !== id),
      favoriteIds: data.favoriteIds.filter((recipeId) => recipeId !== id),
    }),
    () => api.recipes[":id"].permanently.$delete({ param: { id } }),
  );
}

// Adds a tag no recipe uses yet, under an ID made here.
export function createTag(id: string, name: string) {
  const tag = { id, name: normalizeTagName(name), createdAt: new Date() };
  return recipeData.save(
    (data) => ({ ...data, tags: [...data.tags.filter((other) => other.id !== id), tag] }),
    () => api.tags.$post({ json: { id, name } }),
  );
}

// Renames a tag on every recipe that uses it.
export function renameTag(id: string, name: string) {
  const normalized = normalizeTagName(name);
  return recipeData.save(
    (data) => ({
      ...data,
      tags: data.tags.map((tag) => (tag.id === id ? { ...tag, name: normalized } : tag)),
    }),
    () => api.tags[":id"].$put({ param: { id }, json: { name } }),
  );
}

// Moves a tag's recipes to another tag and deletes it. A recipe that had both keeps one.
export function mergeTag(id: string, into: string) {
  return recipeData.save(
    (data) => ({
      ...data,
      tags: data.tags.filter((tag) => tag.id !== id),
      recipes: data.recipes.map((recipe) =>
        recipe.tagIds.includes(id)
          ? {
              ...recipe,
              tagIds: [...new Set(recipe.tagIds.map((tagId) => (tagId === id ? into : tagId)))],
            }
          : recipe,
      ),
    }),
    () => api.tags[":id"].merge.$post({ param: { id }, json: { into } }),
  );
}

// Deletes a tag and takes it off its recipes; the recipes stay.
export function deleteTag(id: string) {
  return recipeData.save(
    (data) => ({
      ...data,
      tags: data.tags.filter((tag) => tag.id !== id),
      recipes: data.recipes.map((recipe) =>
        recipe.tagIds.includes(id)
          ? { ...recipe, tagIds: recipe.tagIds.filter((tagId) => tagId !== id) }
          : recipe,
      ),
    }),
    () => api.tags[":id"].$delete({ param: { id } }),
  );
}

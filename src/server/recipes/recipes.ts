import { normalizeTagName } from "@shared/recipes";
import type { RecipeSection } from "@shared/recipes";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { getDatabase } from "../db/client";
import { isUniqueViolation } from "../db/errors";
import { favorites, recipes, recipeTags, tags } from "../db/schema";

// What the recipe form saves. The last save wins, and leaving out the description or servings
// clears them.
export type RecipeInput = {
  title: string;
  description: string | null;
  servings: number | null;
  ingredients: RecipeSection[];
  instructions: RecipeSection[];
  tagIds: string[];
  // Tags made while writing the recipe, saved with it so an abandoned draft leaves none behind.
  newTags: { id: string; name: string }[];
};

const recipeColumns = {
  id: recipes.id,
  title: recipes.title,
  description: recipes.description,
  servings: recipes.servings,
  imageUrl: recipes.imageUrl,
  sourceUrl: recipes.sourceUrl,
  ingredients: recipes.ingredients,
  instructions: recipes.instructions,
  createdBy: recipes.createdBy,
  updatedBy: recipes.updatedBy,
  createdAt: recipes.createdAt,
  updatedAt: recipes.updatedAt,
};

// Everything the app shows about a household's recipes, in one round trip: the recipes with
// their tags, the household's tags, and the member's favorites, newest first.
export async function listRecipes(householdId: string, userId: string) {
  const db = getDatabase();
  const inHousehold = eq(recipes.householdId, householdId);
  const [recipeRows, tagRows, links, favoriteRows] = await db.batch([
    db.select(recipeColumns).from(recipes).where(inHousehold),
    db
      .select({ id: tags.id, name: tags.name, createdAt: tags.createdAt })
      .from(tags)
      .where(eq(tags.householdId, householdId)),
    db
      .select({ recipeId: recipeTags.recipeId, tagId: recipeTags.tagId })
      .from(recipeTags)
      .innerJoin(recipes, eq(recipeTags.recipeId, recipes.id))
      .where(inHousehold),
    db
      .select({ recipeId: favorites.recipeId })
      .from(favorites)
      .innerJoin(recipes, eq(favorites.recipeId, recipes.id))
      .where(and(eq(favorites.userId, userId), inHousehold))
      .orderBy(desc(favorites.favoritedAt)),
  ]);

  const tagIdsByRecipe = new Map<string, string[]>();
  for (const { recipeId, tagId } of links) {
    const tagIds = tagIdsByRecipe.get(recipeId);
    if (tagIds) tagIds.push(tagId);
    else tagIdsByRecipe.set(recipeId, [tagId]);
  }
  return {
    recipes: recipeRows.map((recipe) => ({
      ...recipe,
      tagIds: tagIdsByRecipe.get(recipe.id) ?? [],
    })),
    tags: tagRows,
    favoriteIds: favoriteRows.map(({ recipeId }) => recipeId),
  };
}

export async function getRecipe(householdId: string, id: string) {
  const [recipe] = await getDatabase()
    .select(recipeColumns)
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.householdId, householdId)))
    .limit(1);
  return recipe ?? null;
}

// The statements that save a recipe's tags: any new ones it uses, then its links. Tag IDs that
// are neither new nor the household's own are dropped, such as a tag deleted meanwhile.
async function tagStatements(householdId: string, recipeId: string, input: RecipeInput) {
  const db = getDatabase();
  const wanted = [...new Set(input.tagIds)];
  const newTags = input.newTags.filter((tag) => wanted.includes(tag.id));
  const existing =
    wanted.length > 0
      ? await db
          .select({ id: tags.id })
          .from(tags)
          .where(and(eq(tags.householdId, householdId), inArray(tags.id, wanted)))
      : [];
  const known = new Set([...existing, ...newTags].map((tag) => tag.id));
  const tagIds = wanted.filter((id) => known.has(id));

  const statements: BatchItem<"sqlite">[] = [];
  if (newTags.length > 0) {
    statements.push(
      db.insert(tags).values(
        newTags.map(({ id, name }) => ({
          id,
          householdId,
          name: normalizeTagName(name),
        })),
      ),
    );
  }
  if (tagIds.length > 0) {
    statements.push(db.insert(recipeTags).values(tagIds.map((tagId) => ({ recipeId, tagId }))));
  }
  return statements;
}

/** Returns false when a recipe or tag with one of the new IDs already exists. */
export async function createRecipe(
  householdId: string,
  userId: string,
  { id, imageUrl, ...input }: RecipeInput & { id: string; imageUrl: string | null },
) {
  const db = getDatabase();
  const { tagIds: _, newTags: __, ...fields } = input;
  try {
    await db.batch([
      db.insert(recipes).values({
        id,
        householdId,
        ...fields,
        imageUrl,
        createdBy: userId,
        updatedBy: userId,
      }),
      ...(await tagStatements(householdId, id, input)),
    ]);
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
}

/**
 * Replaces what the recipe form edits. An undefined image keeps the photo; null removes it.
 * Returns false for a recipe that isn't the household's, and otherwise the image URL the recipe
 * no longer uses, or null.
 */
export async function updateRecipe(
  householdId: string,
  userId: string,
  id: string,
  { imageUrl, ...input }: RecipeInput & { imageUrl: string | null | undefined },
) {
  const db = getDatabase();
  const current = await getRecipe(householdId, id);
  if (!current) return false;
  const { tagIds: _, newTags: __, ...fields } = input;
  await db.batch([
    db
      .update(recipes)
      .set({
        ...fields,
        ...(imageUrl === undefined ? {} : { imageUrl }),
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(recipes.id, id)),
    db.delete(recipeTags).where(eq(recipeTags.recipeId, id)),
    ...(await tagStatements(householdId, id, input)),
  ]);
  const replaced = imageUrl !== undefined && imageUrl !== current.imageUrl;
  return { unusedImageUrl: replaced ? current.imageUrl : null };
}

/** Returns false for a recipe that isn't the household's, and otherwise its image URL. */
export async function deleteRecipe(householdId: string, id: string) {
  const [deleted] = await getDatabase()
    .delete(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.householdId, householdId)))
    .returning({ imageUrl: recipes.imageUrl });
  return deleted ? { unusedImageUrl: deleted.imageUrl } : false;
}

// Two devices may favorite the same recipe; the first stays.
export async function setFavorite(recipeId: string, userId: string, isFavorite: boolean) {
  const db = getDatabase();
  if (isFavorite) {
    await db
      .insert(favorites)
      .values({ userId, recipeId, favoritedAt: new Date() })
      .onConflictDoNothing();
  } else {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.recipeId, recipeId)));
  }
}

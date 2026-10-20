import type { ImportedRecipe, RecipeImportStatus } from "@shared/recipe-import";
import { recipePhotoUrl } from "@shared/recipes";
import { and, asc, eq, ne } from "drizzle-orm";

import { getDatabase } from "../db/client";
import { favorites, recipeImports, recipes, recipeTags, tags } from "../db/schema";

export type RecipeImportRow = typeof recipeImports.$inferSelect;

export async function insertImport(values: typeof recipeImports.$inferInsert) {
  await getDatabase().insert(recipeImports).values(values);
}

export async function getImport(id: string) {
  const [row] = await getDatabase()
    .select()
    .from(recipeImports)
    .where(eq(recipeImports.id, id))
    .limit(1);
  return row ?? null;
}

// A household's tag names, which imports pick fitting tags from.
export async function listTagNames(householdId: string) {
  const rows = await getDatabase()
    .select({ name: tags.name })
    .from(tags)
    .where(eq(tags.householdId, householdId));
  return rows.map((tag) => tag.name);
}

// A member's own imports, oldest first, without the finished recipes.
export async function listImports(userId: string) {
  return getDatabase()
    .select({
      id: recipeImports.id,
      kind: recipeImports.kind,
      status: recipeImports.status,
      sourceUrl: recipeImports.sourceUrl,
      sourcePhotoIds: recipeImports.sourcePhotoIds,
      title: recipeImports.title,
      photoId: recipeImports.photoId,
      error: recipeImports.error,
      createdAt: recipeImports.createdAt,
    })
    .from(recipeImports)
    .where(eq(recipeImports.userId, userId))
    .orderBy(asc(recipeImports.createdAt));
}

export async function updateImport(
  id: string,
  values: Partial<
    Pick<
      RecipeImportRow,
      "status" | "sourceUrl" | "title" | "photoId" | "recipe" | "error" | "runId"
    >
  >,
) {
  await getDatabase()
    .update(recipeImports)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(recipeImports.id, id));
}

// Saves a finished import as a recipe under the import's ID, with the household's tags that match
// by name, and marks the import ready for the member's app to announce. Safe to run twice. Returns
// the source photos the recipe doesn't use, or null when the import was dismissed meanwhile.
// The household's first recipe becomes the member's favorite, so Favorites starts with an example.
export async function saveImportedRecipe(id: string, recipe: ImportedRecipe) {
  const db = getDatabase();
  const row = await getImport(id);
  if (!row) return null;

  const householdTags = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(eq(tags.householdId, row.householdId));
  const tagIds = new Set(
    recipe.tags.flatMap((name) => {
      const match = householdTags.find(
        (tag) => tag.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      );
      return match ? [match.id] : [];
    }),
  );
  const [otherRecipe] = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.householdId, row.householdId), ne(recipes.id, id)))
    .limit(1);
  await db.batch([
    db
      .insert(recipes)
      .values({
        id,
        householdId: row.householdId,
        title: recipe.title,
        description: recipe.description || null,
        servings: recipe.servings,
        imageUrl: row.photoId ? recipePhotoUrl(row.photoId) : null,
        sourceUrl: row.kind === "page" ? row.sourceUrl : null,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        createdBy: row.userId,
        updatedBy: row.userId,
      })
      .onConflictDoNothing(),
    ...[...tagIds].map((tagId) =>
      db.insert(recipeTags).values({ recipeId: id, tagId }).onConflictDoNothing(),
    ),
    ...(otherRecipe
      ? []
      : [
          db
            .insert(favorites)
            .values({ userId: row.userId, recipeId: id, favoritedAt: new Date() })
            .onConflictDoNothing(),
        ]),
    db
      .update(recipeImports)
      .set({ status: "ready", recipe, error: null, updatedAt: new Date() })
      .where(eq(recipeImports.id, id)),
  ]);
  return {
    householdId: row.householdId,
    unusedPhotoIds: (row.sourcePhotoIds ?? []).filter((photoId) => photoId !== row.photoId),
  };
}

// Takes a saved import off the member's list. Whichever of their browsers deletes the row
// announces the new recipe; the others get null.
export async function claimImport(id: string, userId: string) {
  const ready: RecipeImportStatus = "ready";
  const [row] = await getDatabase()
    .delete(recipeImports)
    .where(
      and(
        eq(recipeImports.id, id),
        eq(recipeImports.userId, userId),
        eq(recipeImports.status, ready),
      ),
    )
    .returning({ recipe: recipeImports.recipe });
  return row?.recipe ? { title: row.recipe.title } : null;
}

export async function deleteImport(id: string, userId: string) {
  const [row] = await getDatabase()
    .delete(recipeImports)
    .where(and(eq(recipeImports.id, id), eq(recipeImports.userId, userId)))
    .returning();
  return row ?? null;
}

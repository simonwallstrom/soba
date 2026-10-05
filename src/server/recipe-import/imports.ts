import type { ImportedRecipe, RecipeImportStatus } from "@shared/recipe-import";
import { and, asc, eq } from "drizzle-orm";

import { getDatabase } from "../db/client";
import { recipeImports } from "../db/schema";

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

// Hands a finished import to exactly one of the member's browsers: whichever deletes the row
// first saves the recipe.
export async function claimImport(id: string, userId: string) {
  const [row] = await getDatabase()
    .delete(recipeImports)
    .where(
      and(
        eq(recipeImports.id, id),
        eq(recipeImports.userId, userId),
        eq(recipeImports.status, "ready" satisfies RecipeImportStatus),
      ),
    )
    .returning({
      recipe: recipeImports.recipe,
      sourceUrl: recipeImports.sourceUrl,
      photoId: recipeImports.photoId,
      kind: recipeImports.kind,
    });
  if (!row?.recipe) return null;
  const recipe: ImportedRecipe = row.recipe;
  return {
    recipe,
    sourceUrl: row.kind === "page" ? row.sourceUrl : null,
    photoId: row.photoId,
  };
}

export async function deleteImport(id: string, userId: string) {
  const [row] = await getDatabase()
    .delete(recipeImports)
    .where(and(eq(recipeImports.id, id), eq(recipeImports.userId, userId)))
    .returning();
  return row ?? null;
}

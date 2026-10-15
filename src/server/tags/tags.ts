import { normalizeTagName, sameTagName } from "@shared/recipes";
import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "../db/client";
import { isUniqueViolation } from "../db/errors";
import { recipeTags, tags } from "../db/schema";

// Why a tag change was refused, for the route to answer with.
export type TagError = "not-found" | "name-taken" | "id-taken";

async function householdTags(householdId: string) {
  return getDatabase()
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(eq(tags.householdId, householdId));
}

function nameTaken(existing: { id: string; name: string }[], name: string, exceptId?: string) {
  return existing.some((tag) => tag.id !== exceptId && sameTagName(tag.name, name));
}

/** Adds a tag no recipe uses yet. Its name can't be another tag's, in any case. */
export async function createTag(
  householdId: string,
  { id, name }: { id: string; name: string },
): Promise<TagError | null> {
  if (nameTaken(await householdTags(householdId), name)) return "name-taken";
  try {
    await getDatabase()
      .insert(tags)
      .values({ id, householdId, name: normalizeTagName(name) });
    return null;
  } catch (error) {
    if (isUniqueViolation(error)) return "id-taken";
    throw error;
  }
}

/** Renames a tag for every recipe that uses it. Renaming onto another tag's name is a merge. */
export async function renameTag(
  householdId: string,
  id: string,
  name: string,
): Promise<TagError | null> {
  const existing = await householdTags(householdId);
  if (!existing.some((tag) => tag.id === id)) return "not-found";
  if (nameTaken(existing, name, id)) return "name-taken";
  await getDatabase()
    .update(tags)
    .set({ name: normalizeTagName(name) })
    .where(eq(tags.id, id));
  return null;
}

/**
 * Moves a tag's recipes to another tag and deletes it, in one transaction. A recipe that had both
 * keeps one.
 */
export async function mergeTag(
  householdId: string,
  id: string,
  intoId: string,
): Promise<TagError | null> {
  const existing = await householdTags(householdId);
  if (id === intoId || ![id, intoId].every((tagId) => existing.some((tag) => tag.id === tagId))) {
    return "not-found";
  }
  const db = getDatabase();
  await db.batch([
    db
      .insert(recipeTags)
      .select(
        db
          .select({ recipeId: recipeTags.recipeId, tagId: sql<string>`${intoId}`.as("tag_id") })
          .from(recipeTags)
          .where(eq(recipeTags.tagId, id)),
      )
      .onConflictDoNothing(),
    // Takes its remaining links with it.
    db.delete(tags).where(eq(tags.id, id)),
  ]);
  return null;
}

/** Deletes a tag and takes it off its recipes; the recipes stay. */
export async function deleteTag(householdId: string, id: string): Promise<TagError | null> {
  const [deleted] = await getDatabase()
    .delete(tags)
    .where(and(eq(tags.id, id), eq(tags.householdId, householdId)))
    .returning({ id: tags.id });
  return deleted ? null : "not-found";
}

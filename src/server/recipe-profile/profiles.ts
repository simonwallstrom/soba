import {
  recipeProfileSource,
  recipeProfileSourceHash,
  recipeProfileVersion,
} from "@shared/recipe-profile";
import { desc, eq, isNull, lt, or, sql } from "drizzle-orm";

import { getDatabase } from "../db/client";
import { recipeProfiles, recipes } from "../db/schema";
import { readRecipeProfile } from "./clef";

type ProfileEnv = Pick<Env, "AI" | "AI_GATEWAY_URL">;

// How long a recipe whose read failed waits before the catch-up tries it again.
const retryAfterMs = 60 * 60_000;
// How many recipes one catch-up reads, to stay well inside a scheduled run's limits. At a run
// every 5 minutes, changed questions reach about 120 recipes an hour.
const catchUpLimit = 10;

/**
 * Reads a recipe with Clef for meal suggestions and saves its profile, with the version of the
 * questions it answered and a hash of what it was read from. Does nothing when the profile is
 * already current, such as after an edit to only the photo or tags. Never throws: a failed read
 * is logged and left to the catch-up. See docs/ai-and-meal-planning.md.
 */
export async function profileRecipe(env: ProfileEnv, recipeId: string) {
  try {
    const db = getDatabase();
    // An edit that lands after this moment leaves the recipe due for another read.
    const checkedAt = new Date();
    const [recipe] = await db
      .select({
        title: recipes.title,
        description: recipes.description,
        ingredients: recipes.ingredients,
        instructions: recipes.instructions,
        version: recipeProfiles.version,
        sourceHash: recipeProfiles.sourceHash,
      })
      .from(recipes)
      .leftJoin(recipeProfiles, eq(recipeProfiles.recipeId, recipes.id))
      .where(eq(recipes.id, recipeId))
      .limit(1);
    if (!recipe) return;
    const markChecked = db
      .update(recipes)
      .set({ profileCheckedAt: checkedAt })
      .where(eq(recipes.id, recipeId));

    const source = recipeProfileSource(recipe);
    const sourceHash = recipeProfileSourceHash(source);
    if (recipe.version === recipeProfileVersion && recipe.sourceHash === sourceHash) {
      await markChecked;
      return;
    }

    const gatewayId = new URL(env.AI_GATEWAY_URL).pathname.split("/").filter(Boolean).at(-1) ?? "";
    const answers = await readRecipeProfile(env.AI, gatewayId, source).catch((error: unknown) => {
      console.error("Reading a recipe profile failed", error);
      return null;
    });
    if (!answers) {
      await markChecked;
      return;
    }
    const profile = {
      ...answers,
      version: recipeProfileVersion,
      sourceHash,
      profiledAt: new Date(),
    };
    // Fails, and is logged, if the recipe was deleted while the model read it.
    await db.batch([
      markChecked,
      db
        .insert(recipeProfiles)
        .values({ recipeId, ...profile })
        .onConflictDoUpdate({ target: recipeProfiles.recipeId, set: profile }),
    ]);
  } catch (error) {
    console.error("Saving a recipe profile failed", error);
  }
}

/**
 * The catch-up, run on a schedule: reads recipes that were never read or changed since their
 * last read, and, once an hour each, those whose read failed or answered older questions.
 */
export async function profileStaleRecipes(env: ProfileEnv, now = new Date()) {
  const due = await getDatabase()
    .select({ id: recipes.id })
    .from(recipes)
    .leftJoin(recipeProfiles, eq(recipeProfiles.recipeId, recipes.id))
    .where(
      or(
        isNull(recipes.profileCheckedAt),
        lt(recipes.profileCheckedAt, recipes.updatedAt),
        sql`(${or(isNull(recipeProfiles.recipeId), lt(recipeProfiles.version, recipeProfileVersion))}) and ${lt(recipes.profileCheckedAt, new Date(now.getTime() - retryAfterMs))}`,
      ),
    )
    .orderBy(desc(recipes.updatedAt))
    .limit(catchUpLimit);
  for (const { id } of due) await profileRecipe(env, id);
  return due.length;
}

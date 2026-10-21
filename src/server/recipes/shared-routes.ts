import { recipePhotoUrl, sharedPhotoPath, shareTokenPattern } from "@shared/recipes";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import * as v from "valibot";

import { getSession } from "../auth/auth";
import { requireSession } from "../auth/middleware";
import { getMembership } from "../household/household";
import { requireHousehold } from "../household/middleware";
import type { HouseholdEnv } from "../household/middleware";
import { validateJson } from "../lib/validate";
import { copyPhoto, deletePhotos, photoKey, uploadedPhotoId } from "../photos/photo";
import { createRecipe, findCopy, findSharedRecipe } from "./recipes";

const notFound = { error: "Recipe not found" };

// Keyed by address, as anyone can ask, with any token.
const rateLimit = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const key = c.req.header("cf-connecting-ip") ?? "unknown";
  const { success } = await c.env.PUBLIC_RATE_LIMITER.limit({ key });
  if (!success) return c.json({ error: "Too many requests. Try again in a minute." }, 429);
  return next();
});

// Turning sharing off works at once, and shared links stay out of search results.
const uncached = createMiddleware(async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex");
});

// Shared recipes, for anyone with the link. They show only what the shared page needs: no IDs,
// tags, or members.
export const sharedRecipeRoutes = new Hono<HouseholdEnv>()
  .use(rateLimit, uncached)
  .get("/:token", async (c) => {
    const token = c.req.param("token");
    const recipe = shareTokenPattern.test(token) ? await findSharedRecipe(token) : null;
    if (!recipe) return c.json(notFound, 404);

    // A member of the recipe's household goes to the recipe itself; a member of another household
    // can save it, once.
    const session = await getSession(c.req.raw.headers);
    const membership = session && (await getMembership(session.user.id));
    const isOwn = membership?.id === recipe.householdId;
    const savedRecipeId = membership && !isOwn ? await findCopy(membership.id, recipe.id) : null;

    return c.json(
      {
        recipe: {
          title: recipe.title,
          description: recipe.description,
          servings: recipe.servings,
          imageUrl: uploadedPhotoId(recipe.imageUrl) ? sharedPhotoPath(token) : recipe.imageUrl,
          sourceUrl: recipe.sourceUrl,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          updatedAt: recipe.updatedAt,
        },
        household: { name: recipe.householdName, language: recipe.language },
        viewer: { ownRecipeId: isOwn ? recipe.id : null, savedRecipeId },
      },
      200,
    );
  })
  .get("/:token/photo", async (c) => {
    const token = c.req.param("token");
    const recipe = shareTokenPattern.test(token) ? await findSharedRecipe(token) : null;
    const photoId = recipe && uploadedPhotoId(recipe.imageUrl);
    if (!recipe || !photoId) return c.json({ error: "Photo not found" }, 404);
    const object = await c.env.PHOTOS.get(photoKey(recipe.householdId, photoId));
    if (!object) return c.json({ error: "Photo not found" }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(object.body, { headers });
  })
  // Copies the recipe into the member's household, under an ID the app made, with a copy of its
  // photo. Saving it again answers with the copy already saved.
  .post(
    "/:token/save",
    requireSession,
    requireHousehold,
    validateJson(v.object({ id: v.pipe(v.string(), v.uuid()) })),
    async (c) => {
      const token = c.req.param("token");
      const recipe = shareTokenPattern.test(token) ? await findSharedRecipe(token) : null;
      if (!recipe) return c.json(notFound, 404);
      const householdId = c.get("membership").id;
      const userId = c.get("user").id;
      if (recipe.householdId === householdId) {
        return c.json({ error: "This recipe is already in your household" }, 409);
      }
      const saved = await findCopy(householdId, recipe.id);
      if (saved) return c.json({ recipeId: saved }, 200);

      const { id } = c.req.valid("json");
      // An uploaded photo is copied, so it stays when the original goes; an image elsewhere is
      // linked as it is.
      const photoId = uploadedPhotoId(recipe.imageUrl);
      const copiedPhotoId = photoId
        ? await copyPhoto(
            c.env.PHOTOS,
            { householdId: recipe.householdId, photoId },
            { householdId, uploadedBy: userId },
          )
        : null;
      let imageUrl = photoId ? null : recipe.imageUrl;
      if (copiedPhotoId) imageUrl = recipePhotoUrl(copiedPhotoId);
      const created = await createRecipe(householdId, userId, {
        id,
        title: recipe.title,
        description: recipe.description,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        tagIds: [],
        newTags: [],
        imageUrl,
        sourceUrl: recipe.sourceUrl,
        copiedFrom: recipe.id,
      });
      if (created) return c.json({ recipeId: id }, 201);
      if (copiedPhotoId)
        c.executionCtx.waitUntil(deletePhotos(c.env.PHOTOS, householdId, [copiedPhotoId]));
      // Saved meanwhile, perhaps on another device.
      const savedMeanwhile = await findCopy(householdId, recipe.id);
      if (savedMeanwhile) return c.json({ recipeId: savedMeanwhile }, 200);
      return c.json({ error: "This recipe is already saved" }, 409);
    },
  );

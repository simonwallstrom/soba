import {
  recipeProfileSource,
  recipeProfileSourceHash,
  recipeProfileVersion,
} from "@shared/recipe-profile";
import { recipePhotoUrl } from "@shared/recipes";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import * as v from "valibot";

import { requireSession } from "../auth/middleware";
import { requireHousehold } from "../household/middleware";
import type { HouseholdEnv } from "../household/middleware";
import { validateJson } from "../lib/validate";
import { readRecipeProfile } from "../recipe-profile/clef";
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  listRecipes,
  saveRecipeProfile,
  setFavorite,
  updateRecipe,
} from "./recipes";

const idSchema = v.pipe(v.string(), v.uuid());

const sectionsSchema = v.pipe(
  v.array(
    v.object({
      heading: v.optional(v.pipe(v.string(), v.maxLength(200))),
      items: v.pipe(v.array(v.pipe(v.string(), v.maxLength(2000))), v.maxLength(200)),
    }),
  ),
  v.maxLength(20),
);

// Looser than the form's own limits; see recipeTitleMaxLength.
const recipeSchema = {
  title: v.pipe(v.string(), v.trim(), v.minLength(1, "Give the recipe a title"), v.maxLength(200)),
  description: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(2000))),
  servings: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(1000))),
  ingredients: sectionsSchema,
  instructions: sectionsSchema,
  tagIds: v.pipe(v.array(idSchema), v.maxLength(30)),
  newTags: v.optional(
    v.pipe(
      v.array(
        v.object({
          id: idSchema,
          name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
        }),
      ),
      v.maxLength(30),
    ),
    [],
  ),
};

function recipeInput({
  description,
  servings,
  ...recipe
}: v.InferOutput<v.ObjectSchema<typeof recipeSchema, undefined>>) {
  return { ...recipe, description: description || null, servings: servings ?? null };
}

// Each read calls a model, so every member gets an allowance well above normal editing.
const limitProfiles = createMiddleware<HouseholdEnv>(async (c, next) => {
  const { success } = await c.env.PROFILE_RATE_LIMITER.limit({ key: c.get("user").id });
  if (!success) return c.json({ error: "Too many recipes at once. Try again in a minute." }, 429);
  return next();
});

const notFound = { error: "Recipe not found" };

// The household's recipes, tags, and the member's favorites. The app generates recipe and tag
// IDs, so it can show a new recipe before the server has answered.
export const recipeRoutes = new Hono<HouseholdEnv>()
  .use(requireSession, requireHousehold)
  .get("/", async (c) => {
    c.header("Cache-Control", "private, no-store");
    return c.json(await listRecipes(c.get("membership").id, c.get("user").id), 200);
  })
  .post(
    "/",
    validateJson(v.object({ id: idSchema, ...recipeSchema, photoId: v.optional(idSchema) })),
    async (c) => {
      const { id, photoId, ...recipe } = c.req.valid("json");
      const created = await createRecipe(c.get("membership").id, c.get("user").id, {
        id,
        ...recipeInput(recipe),
        imageUrl: photoId ? recipePhotoUrl(photoId) : null,
      });
      if (!created) return c.json({ error: "This recipe is already saved" }, 409);
      return c.json({ ok: true }, 201);
    },
  )
  // Replaces the recipe. Leaving out the photo keeps it; null removes it.
  .put(
    "/:id",
    validateJson(v.object({ ...recipeSchema, photoId: v.optional(v.nullable(idSchema)) })),
    async (c) => {
      const { photoId, ...recipe } = c.req.valid("json");
      const updated = await updateRecipe(
        c.get("membership").id,
        c.get("user").id,
        c.req.param("id"),
        {
          ...recipeInput(recipe),
          imageUrl: photoId ? recipePhotoUrl(photoId) : photoId,
        },
      );
      if (!updated) return c.json(notFound, 404);
      return c.json({ ok: true }, 200);
    },
  )
  .delete("/:id", async (c) => {
    const deleted = await deleteRecipe(c.get("membership").id, c.req.param("id"));
    if (!deleted) return c.json(notFound, 404);
    return c.json({ ok: true }, 200);
  })
  .put("/:id/favorite", async (c) => {
    const recipe = await getRecipe(c.get("membership").id, c.req.param("id"));
    if (!recipe) return c.json(notFound, 404);
    await setFavorite(recipe.id, c.get("user").id, true);
    return c.json({ ok: true }, 200);
  })
  .delete("/:id/favorite", async (c) => {
    await setFavorite(c.req.param("id"), c.get("user").id, false);
    return c.json({ ok: true }, 200);
  })
  // Reads the recipe for meal suggestions and saves the profile, with the version of the
  // questions it answered and a hash of what it was read from. The app decides when; see
  // docs/ai-and-meal-planning.md.
  .post("/:id/profile", limitProfiles, async (c) => {
    const recipe = await getRecipe(c.get("membership").id, c.req.param("id"));
    if (!recipe) return c.json(notFound, 404);
    const source = recipeProfileSource(recipe);
    const gatewayId =
      new URL(c.env.AI_GATEWAY_URL).pathname.split("/").filter(Boolean).at(-1) ?? "";
    const answers = await readRecipeProfile(c.env.AI, gatewayId, source).catch((error: unknown) => {
      console.error("Reading a recipe profile failed", error);
      return null;
    });
    if (!answers) return c.json({ error: "Couldn't read the recipe" }, 502);
    const profile = {
      ...answers,
      version: recipeProfileVersion,
      sourceHash: recipeProfileSourceHash(source),
    };
    await saveRecipeProfile(recipe.id, profile);
    return c.json({ profile }, 200);
  });

import { recipeProfileSource, recipeProfileVersion } from "@shared/recipe-profile";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import * as v from "valibot";

import { requireSession } from "../auth/middleware";
import { requireHousehold } from "../household/middleware";
import type { HouseholdEnv } from "../household/middleware";
import { validateJson } from "../lib/validate";
import { readRecipeProfile } from "./clef";

const linesSchema = v.pipe(
  v.array(
    v.object({
      heading: v.optional(v.pipe(v.string(), v.maxLength(200))),
      items: v.pipe(v.array(v.pipe(v.string(), v.maxLength(2000))), v.maxLength(200)),
    }),
  ),
  v.maxLength(20),
);

// Each read calls a model, so every member gets an allowance well above normal editing.
const limitProfiles = createMiddleware<HouseholdEnv>(async (c, next) => {
  const { success } = await c.env.PROFILE_RATE_LIMITER.limit({ key: c.get("user").id });
  if (!success) return c.json({ error: "Too many recipes at once. Try again in a minute." }, 429);
  return next();
});

// Reads a recipe for meal suggestions. The client sends the recipe, since recipes live in the
// synced store, and saves the profile it gets back with the version of the questions it answered.
export const recipeProfileRoutes = new Hono<HouseholdEnv>()
  .use(requireSession, requireHousehold)
  .post(
    "/",
    limitProfiles,
    validateJson(
      v.object({
        title: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
        description: v.optional(v.pipe(v.string(), v.maxLength(2000))),
        ingredients: linesSchema,
        instructions: linesSchema,
      }),
    ),
    async (c) => {
      const source = recipeProfileSource(c.req.valid("json"));
      const gatewayId =
        new URL(c.env.AI_GATEWAY_URL).pathname.split("/").filter(Boolean).at(-1) ?? "";
      const profile = await readRecipeProfile(c.env.AI, gatewayId, source).catch(
        (error: unknown) => {
          console.error("Reading a recipe profile failed", error);
          return null;
        },
      );
      if (!profile) return c.json({ error: "Couldn't read the recipe" }, 502);
      return c.json({ profile, version: recipeProfileVersion }, 200);
    },
  );

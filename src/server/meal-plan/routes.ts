import { mealDatePattern } from "@shared/meal-plan";
import { Hono } from "hono";
import * as v from "valibot";

import { requireSession } from "../auth/middleware";
import { requireHousehold } from "../household/middleware";
import type { HouseholdEnv } from "../household/middleware";
import { validateJson } from "../lib/validate";
import { listMeals, moveMeal, planMeals, unplanMeals } from "./meal-plan";

const dateSchema = v.pipe(v.string(), v.regex(mealDatePattern, "Use a date like 2026-10-12"));

// Two weeks at a time is plenty: the app plans, copies, and clears a week at once.
const maxDays = 14;

// The household's meal plan: one dinner a day.
export const mealPlanRoutes = new Hono<HouseholdEnv>()
  .use(requireSession, requireHousehold)
  .get("/", async (c) => {
    c.header("Cache-Control", "private, no-store");
    return c.json({ meals: await listMeals(c.get("membership").id) }, 200);
  })
  // Plans a dinner for each day given, replacing any already there.
  .put(
    "/",
    validateJson(
      v.object({
        meals: v.pipe(
          v.array(
            v.object({
              date: dateSchema,
              recipeId: v.pipe(v.string(), v.maxLength(100)),
              // The suggestion that planned it, for undoing it as a whole.
              suggestionId: v.optional(v.pipe(v.string(), v.maxLength(100))),
            }),
          ),
          v.minLength(1),
          v.maxLength(maxDays),
        ),
      }),
    ),
    async (c) => {
      // The last plan for a day wins.
      const byDate = new Map(
        c.req
          .valid("json")
          .meals.map((meal) => [meal.date, { ...meal, suggestionId: meal.suggestionId ?? null }]),
      );
      const planned = await planMeals(c.get("membership").id, c.get("user").id, [
        ...byDate.values(),
      ]);
      if (!planned) return c.json({ error: "Recipe not found" }, 404);
      return c.json({ ok: true }, 200);
    },
  )
  .post(
    "/remove",
    validateJson(
      v.object({ dates: v.pipe(v.array(dateSchema), v.minLength(1), v.maxLength(maxDays)) }),
    ),
    async (c) => {
      await unplanMeals(c.get("membership").id, c.req.valid("json").dates);
      return c.json({ ok: true }, 200);
    },
  )
  // Moves a day's meal to another day, swapping with a meal already there.
  .post("/move", validateJson(v.object({ from: dateSchema, to: dateSchema })), async (c) => {
    const { from, to } = c.req.valid("json");
    await moveMeal(c.get("membership").id, from, to);
    return c.json({ ok: true }, 200);
  });

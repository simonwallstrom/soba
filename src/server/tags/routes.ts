import { Hono } from "hono";
import type { Context } from "hono";
import * as v from "valibot";

import { requireSession } from "../auth/middleware";
import { requireHousehold } from "../household/middleware";
import type { HouseholdEnv } from "../household/middleware";
import { validateJson } from "../lib/validate";
import { createTag, deleteTag, mergeTag, renameTag } from "./tags";
import type { TagError } from "./tags";

const idSchema = v.pipe(v.string(), v.uuid());
const nameSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Give the tag a name"),
  v.maxLength(100),
);

function answer(c: Context<HouseholdEnv>, error: TagError | null, status: 200 | 201 = 200) {
  if (error === "not-found") return c.json({ error: "Tag not found" }, 404);
  if (error === "name-taken") return c.json({ error: "A tag with this name already exists" }, 409);
  if (error === "id-taken") return c.json({ error: "This tag is already saved" }, 409);
  return c.json({ ok: true }, status);
}

// Managing the household's tags from Settings. Recipes add the tags they use when saved; see
// the recipe routes. Every member can manage them.
export const tagRoutes = new Hono<HouseholdEnv>()
  .use(requireSession, requireHousehold)
  .post("/", validateJson(v.object({ id: idSchema, name: nameSchema })), async (c) =>
    answer(c, await createTag(c.get("membership").id, c.req.valid("json")), 201),
  )
  .put("/:id", validateJson(v.object({ name: nameSchema })), async (c) =>
    answer(c, await renameTag(c.get("membership").id, c.req.param("id"), c.req.valid("json").name)),
  )
  .post("/:id/merge", validateJson(v.object({ into: idSchema })), async (c) =>
    answer(c, await mergeTag(c.get("membership").id, c.req.param("id"), c.req.valid("json").into)),
  )
  .delete("/:id", async (c) =>
    answer(c, await deleteTag(c.get("membership").id, c.req.param("id"))),
  );

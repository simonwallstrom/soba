import { Hono } from "hono";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import * as v from "valibot";

import { requireSession } from "../auth/middleware";
import { requireHousehold } from "../household/middleware";
import type { HouseholdEnv } from "../household/middleware";
import { validateJson } from "../lib/validate";
import { detectPhotoType, maxPhotoBytes, photoKey, savePhoto } from "../photos/photo";
import type { PhotoType } from "../photos/photo";
import type { ImportSettings } from "./extract";
import {
  claimImport,
  deleteImport,
  getImport,
  insertImport,
  listImports,
  updateImport,
} from "./imports";
import { parseRecipeUrl } from "./page";

const maxPhotos = 3;

// The household's tag names, sent by the client because tags live in the synced recipe store.
const tagNamesSchema = v.pipe(v.array(v.pipe(v.string(), v.maxLength(100))), v.maxLength(500));

// Each import calls a paid model, so every member gets a modest allowance.
const limitImports = createMiddleware<HouseholdEnv>(async (c, next) => {
  const { success } = await c.env.IMPORT_RATE_LIMITER.limit({ key: c.get("user").id });
  if (!success) return c.json({ error: "Too many imports. Try again in a minute." }, 429);
  return next();
});

// Starts imports that a Workflow finishes in the background, lists the member's unfinished
// ones, and hands each finished recipe to one of the member's browsers to save.
export const recipeImportRoutes = new Hono<HouseholdEnv>()
  .use(requireSession, requireHousehold)
  .get("/", async (c) => {
    c.header("Cache-Control", "private, no-store");
    return c.json({ imports: await listImports(c.get("user").id) }, 200);
  })
  .post(
    "/url",
    limitImports,
    validateJson(
      v.object({ url: v.pipe(v.string(), v.maxLength(2000)), tagNames: tagNamesSchema }),
    ),
    async (c) => {
      const { url: value, tagNames } = c.req.valid("json");
      const url = parseRecipeUrl(value);
      if (!url) return c.json({ error: "Enter a link that starts with https://" }, 400);
      return start(c, { kind: "page", sourceUrl: url.toString() }, tagNames);
    },
  )
  // A form with up to three "photo" files, in page order, and the household's "tag" names.
  .post("/photos", limitImports, async (c) => {
    let form: FormData;
    try {
      form = await c.req.raw.formData();
    } catch {
      return c.json({ error: "Choose a photo of the recipe" }, 400);
    }
    const files = form.getAll("photo").filter((entry) => entry instanceof File);
    if (files.length === 0) return c.json({ error: "Choose a photo of the recipe" }, 400);
    if (files.length > maxPhotos) {
      return c.json({ error: `Choose at most ${maxPhotos} photos` }, 400);
    }
    const photos: { bytes: Uint8Array; type: PhotoType }[] = [];
    for (const file of files) {
      if (file.size > maxPhotoBytes) return c.json({ error: "Choose photos under 5 MB" }, 413);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = detectPhotoType(bytes);
      if (!type) return c.json({ error: "Choose JPEG, PNG or WebP photos" }, 415);
      photos.push({ bytes, type });
    }
    const tagNames = v.safeParse(
      tagNamesSchema,
      form.getAll("tag").filter((entry) => typeof entry === "string"),
    );
    if (!tagNames.success) return c.json({ error: "Invalid request" }, 400);

    const owner = { householdId: c.get("membership").id, uploadedBy: c.get("user").id };
    const sourcePhotoIds = await Promise.all(
      photos.map(({ bytes, type }) => savePhoto(c.env.PHOTOS, owner, bytes, type)),
    );
    // The first photo stands in for the recipe while it is written.
    return start(
      c,
      { kind: "photos", sourcePhotoIds, photoId: sourcePhotoIds[0] ?? null },
      tagNames.output,
    );
  })
  // Deleting the import as it is handed over means only one browser ever saves it.
  .post("/:id/claim", async (c) => {
    const claimed = await claimImport(c.req.param("id"), c.get("user").id);
    if (!claimed) return c.json({ error: "Import not found" }, 404);
    return c.json(claimed, 200);
  })
  .post(
    "/:id/retry",
    limitImports,
    validateJson(v.object({ tagNames: tagNamesSchema })),
    async (c) => {
      const row = await getImport(c.req.param("id"));
      if (!row || row.userId !== c.get("user").id)
        return c.json({ error: "Import not found" }, 404);
      if (row.status !== "failed") return c.json({ error: "This import is still running" }, 409);
      const runId = crypto.randomUUID();
      await updateImport(row.id, { status: "reading", error: null, runId });
      await c.env.RECIPE_IMPORT.create({
        id: runId,
        params: { importId: row.id, settings: settings(c, c.req.valid("json").tagNames) },
      });
      return c.json({ ok: true }, 200);
    },
  )
  // Cancels an import that is still running, or dismisses one that failed.
  .delete("/:id", async (c) => {
    const row = await deleteImport(c.req.param("id"), c.get("user").id);
    if (!row) return c.json({ error: "Import not found" }, 404);
    if (row.status === "reading" || row.status === "writing") {
      await c.env.RECIPE_IMPORT.get(row.runId)
        .then((run) => run.terminate())
        .catch(() => {});
    }
    // No recipe uses these photos yet.
    const photoIds = new Set([
      ...(row.sourcePhotoIds ?? []),
      ...(row.photoId ? [row.photoId] : []),
    ]);
    if (photoIds.size > 0) {
      await c.env.PHOTOS.delete([...photoIds].map((id) => photoKey(row.householdId, id)));
    }
    return c.json({ ok: true }, 200);
  });

type ImportContext = Context<HouseholdEnv>;

function settings(c: ImportContext, tagNames: string[]): ImportSettings {
  const { language, units } = c.get("membership");
  return { language, units, tagNames };
}

async function start(
  c: ImportContext,
  source:
    | { kind: "page"; sourceUrl: string }
    | { kind: "photos"; sourcePhotoIds: string[]; photoId: string | null },
  tagNames: string[],
) {
  const id = crypto.randomUUID();
  const runId = crypto.randomUUID();
  await insertImport({
    id,
    householdId: c.get("membership").id,
    userId: c.get("user").id,
    status: "reading",
    runId,
    ...source,
  });
  try {
    await c.env.RECIPE_IMPORT.create({
      id: runId,
      params: { importId: id, settings: settings(c, tagNames) },
    });
  } catch (error) {
    console.error("Could not start a recipe import", error);
    await deleteImport(id, c.get("user").id);
    return c.json({ error: "Could not start the import. Please try again." }, 502);
  }
  return c.json({ id }, 201);
}

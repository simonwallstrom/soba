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
  listTagNames,
  updateImport,
} from "./imports";
import { parseRecipeUrl } from "./page";

const maxPhotos = 3;

// Each import calls a paid model, so every member gets a modest allowance.
const limitImports = createMiddleware<HouseholdEnv>(async (c, next) => {
  const { success } = await c.env.IMPORT_RATE_LIMITER.limit({ key: c.get("user").id });
  if (!success) return c.json({ error: "Too many imports. Try again in a minute." }, 429);
  return next();
});

// Starts imports that a Workflow finishes in the background and saves as recipes, and lists the
// member's own: those still running, those that failed, and those saved but not yet announced.
export const recipeImportRoutes = new Hono<HouseholdEnv>()
  .use(requireSession, requireHousehold)
  .get("/", async (c) => {
    c.header("Cache-Control", "private, no-store");
    return c.json({ imports: await listImports(c.get("user").id) }, 200);
  })
  .post(
    "/url",
    limitImports,
    validateJson(v.object({ url: v.pipe(v.string(), v.maxLength(2000)) })),
    async (c) => {
      const url = parseRecipeUrl(c.req.valid("json").url);
      if (!url) return c.json({ error: "Enter a link that starts with https://" }, 400);
      return start(c, { kind: "page", sourceUrl: url.toString() });
    },
  )
  // A form with up to three "photo" files, in page order.
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

    const owner = { householdId: c.get("membership").id, uploadedBy: c.get("user").id };
    const sourcePhotoIds = await Promise.all(
      photos.map(({ bytes, type }) => savePhoto(c.env.PHOTOS, owner, bytes, type)),
    );
    // The first photo stands in for the recipe while it is written.
    return start(c, { kind: "photos", sourcePhotoIds, photoId: sourcePhotoIds[0] ?? null });
  })
  // Takes a saved import off the list, to announce its recipe. Only one of the member's browsers
  // gets it.
  .post("/:id/claim", async (c) => {
    const claimed = await claimImport(c.req.param("id"), c.get("user").id);
    if (!claimed) return c.json({ error: "Import not found" }, 404);
    return c.json(claimed, 200);
  })
  .post("/:id/retry", limitImports, async (c) => {
    const row = await getImport(c.req.param("id"));
    if (!row || row.userId !== c.get("user").id) return c.json({ error: "Import not found" }, 404);
    if (row.status !== "failed") return c.json({ error: "This import is still running" }, 409);
    const runId = crypto.randomUUID();
    await updateImport(row.id, { status: "reading", error: null, runId });
    await c.env.RECIPE_IMPORT.create({
      id: runId,
      params: { importId: row.id, settings: await settings(c) },
    });
    return c.json({ ok: true }, 200);
  })
  // Cancels an import that is still running, or dismisses one that failed.
  .delete("/:id", async (c) => {
    const row = await deleteImport(c.req.param("id"), c.get("user").id);
    if (!row) return c.json({ error: "Import not found" }, 404);
    // Already a recipe, which keeps its photo.
    if (row.status === "ready") return c.json({ ok: true }, 200);
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

async function settings(c: ImportContext): Promise<ImportSettings> {
  const { id, language, units } = c.get("membership");
  return { language, units, tagNames: await listTagNames(id) };
}

async function start(
  c: ImportContext,
  source:
    | { kind: "page"; sourceUrl: string }
    | { kind: "photos"; sourcePhotoIds: string[]; photoId: string | null },
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
      params: { importId: id, settings: await settings(c) },
    });
  } catch (error) {
    console.error("Could not start a recipe import", error);
    await deleteImport(id, c.get("user").id);
    return c.json({ error: "Could not start the import. Please try again." }, 502);
  }
  return c.json({ id }, 201);
}

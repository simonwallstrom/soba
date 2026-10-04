import { Hono } from "hono";

import { requireSession } from "../auth/middleware";
import { requireHousehold } from "../household/middleware";
import type { HouseholdEnv } from "../household/middleware";
import { detectPhotoType, isPhotoId, maxPhotoBytes, photoKey } from "./photo";

// Recipe photos for the signed-in member's household. Recipes refer to a photo by its ID.
export const photoRoutes = new Hono<HouseholdEnv>()
  .use(requireSession, requireHousehold)
  // The body is the image itself.
  .post("/", async (c) => {
    const tooLarge = () => c.json({ error: "Choose a photo under 5 MB" }, 413);
    if (Number(c.req.header("content-length")) > maxPhotoBytes) return tooLarge();
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    if (bytes.byteLength > maxPhotoBytes) return tooLarge();
    const type = detectPhotoType(bytes);
    if (!type) return c.json({ error: "Choose a JPEG, PNG or WebP photo" }, 415);

    const photoId = crypto.randomUUID();
    await c.env.PHOTOS.put(photoKey(c.get("membership").id, photoId), bytes, {
      httpMetadata: { contentType: type },
      customMetadata: { uploadedBy: c.get("user").id },
    });
    return c.json({ photoId }, 201);
  })
  .get("/:photoId", async (c) => {
    const photoId = c.req.param("photoId");
    if (!isPhotoId(photoId)) return c.json({ error: "Photo not found" }, 404);
    const object = await c.env.PHOTOS.get(photoKey(c.get("membership").id, photoId), {
      onlyIf: c.req.raw.headers,
    });
    if (!object) return c.json({ error: "Photo not found" }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    // A photo never changes under its ID; replacing one uploads a new ID.
    headers.set("Cache-Control", "private, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    if (!("body" in object)) return new Response(null, { status: 304, headers });
    return new Response(object.body, { headers });
  });

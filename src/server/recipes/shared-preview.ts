import { shareTokenPattern } from "@shared/recipes";
import type { Context } from "hono";

import { photoKey, uploadedPhotoId } from "../photos/photo";
import { browserUserAgent } from "../recipe-import/page";
import { findSharedRecipe } from "./recipes";

// Link previews' usual shape, as large as uploaded photos are (1600px on the long edge).
export const previewSize = { width: 1600, height: 840 };

// Soba's own preview, the start page's drawings around the wordmark (2400 × 1260), for recipes
// without a photo, and every other page.
export const sitePreview = {
  path: "/og-image.jpg",
  width: 2400,
  height: 1260,
  alt: "Soba, recipe organizer for families",
};

function previewResponse(body: ReadableStream | null) {
  return new Response(body, {
    headers: {
      "Content-Type": "image/jpeg",
      // Short, so a link that was turned off soon stops showing it. Edits change the URL.
      "Cache-Control": "public, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}

// The recipe's photo, cropped to a link preview's shape as a JPEG, which every chat app reads,
// unlike the WebP most uploads are. Without one, or if it can't be read, Soba's own preview.
export async function sharedRecipePreview(c: Context<{ Bindings: Env }>) {
  const token = c.req.param("token") ?? "";
  const { success } = await c.env.PUBLIC_RATE_LIMITER.limit({
    key: c.req.header("cf-connecting-ip") ?? "unknown",
  });
  if (!success) return c.json({ error: "Too many requests. Try again in a minute." }, 429);
  const recipe = shareTokenPattern.test(token) ? await findSharedRecipe(token) : null;
  if (!recipe) return c.json({ error: "Recipe not found" }, 404);

  try {
    const photoId = uploadedPhotoId(recipe.imageUrl);
    let body: ReadableStream<Uint8Array> | null = null;
    if (photoId) {
      body = (await c.env.PHOTOS.get(photoKey(recipe.householdId, photoId)))?.body ?? null;
    } else if (recipe.imageUrl) {
      const response = await fetch(recipe.imageUrl, {
        headers: { "User-Agent": browserUserAgent },
        signal: AbortSignal.timeout(5000),
      });
      body = response.ok ? response.body : null;
    }
    if (body) {
      const result = await c.env.IMAGES.input(body)
        .transform({ ...previewSize, fit: "cover" })
        .output({ format: "image/jpeg", quality: 80 });
      return previewResponse(result.image());
    }
  } catch (error) {
    console.error("Reading a photo for a link preview failed", error);
  }
  const site = await c.env.ASSETS.fetch(new URL(sitePreview.path, c.req.url));
  return previewResponse(site.body);
}

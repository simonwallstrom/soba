import { shareTokenPattern } from "@shared/recipes";
import type { Context } from "hono";

import { findSharedRecipe } from "./recipes";
import { previewSize, sitePreview } from "./shared-preview";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// The app's page for a shared recipe, with the tags chat apps and social sites read for a link
// preview. They don't run the app, so the Worker adds the tags to index.html.
export async function sharedRecipePage(c: Context<{ Bindings: Env }>) {
  const token = c.req.param("token") ?? "";
  const asset = await c.env.ASSETS.fetch(new URL("/", c.req.url));
  const headers = new Headers(asset.headers);
  // Turning sharing off works at once, and shared links stay out of search results.
  headers.set("Cache-Control", "no-store");
  headers.set("X-Robots-Tag", "noindex");
  const html = new Response(asset.body, { status: asset.status, headers });

  const key = c.req.header("cf-connecting-ip") ?? "unknown";
  const { success } = await c.env.PUBLIC_RATE_LIMITER.limit({ key });
  const recipe = success && shareTokenPattern.test(token) ? await findSharedRecipe(token) : null;
  // The app shows that the link doesn't work.
  if (!recipe) return html;

  const url = new URL(c.req.url);
  const page = new URL(url.pathname, url.origin).toString();
  // The photo's URL changes with the recipe, so chat apps fetch it again after an edit.
  const preview = recipe.imageUrl
    ? {
        url: new URL(`${url.pathname}/og.jpg?v=${recipe.updatedAt.getTime()}`, url.origin),
        ...previewSize,
        alt: recipe.title,
      }
    : { ...sitePreview, url: new URL(sitePreview.path, url.origin), alt: sitePreview.alt };
  const tags: [string, string][] = [
    ["og:type", "article"],
    ["og:site_name", "Soba"],
    ["og:url", page],
    ["og:title", recipe.title],
    ["og:description", recipe.description ?? `A recipe shared by ${recipe.householdName}`],
    ["og:image", preview.url.toString()],
    ["og:image:type", "image/jpeg"],
    ["og:image:width", String(preview.width)],
    ["og:image:height", String(preview.height)],
    ["og:image:alt", preview.alt],
    ["twitter:card", "summary_large_image"],
  ];
  const meta = tags
    .map(([property, content]) => {
      const attribute = property.startsWith("twitter:") ? "name" : "property";
      return `<meta ${attribute}="${property}" content="${escapeHtml(content)}" />`;
    })
    .join("");
  // In place of the tags index.html has for Soba itself.
  return new HTMLRewriter()
    .on('meta[property^="og:"]', { element: (tag) => void tag.remove() })
    .on('meta[name^="twitter:"]', { element: (tag) => void tag.remove() })
    .on("head", { element: (head) => void head.append(meta, { html: true }) })
    .transform(html);
}

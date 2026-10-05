// Reads a recipe page into what the model needs: its readable text, any structured recipe data
// the site publishes, and the image it shares links with.

// Enough for long recipe blogs; the rest of a larger page is comments and ads.
const maxPageBytes = 3 * 1024 * 1024;
// Roughly 40k tokens. Recipe cards often sit below a long story, so this is generous.
const maxTextLength = 150_000;
const fetchTimeout = 15_000;

// Markup that never holds the recipe itself.
const skippedElements = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "iframe",
  "nav",
  "footer",
  "form",
  "button",
  "select",
].join(", ");

export type RecipePage = {
  url: string;
  title: string | null;
  imageUrl: string | null;
  // JSON-LD blocks that mention a recipe, as published.
  structuredData: string[];
  text: string;
};

export class PageError extends Error {}

export function parseRecipeUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  return url.protocol === "https:" || url.protocol === "http:" ? url : null;
}

// Many recipe sites, and the image servers behind them, turn away requests that do not look
// like a browser. A Worker's fetch sends no User-Agent at all.
export const browserUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

export async function fetchRecipePage(url: URL): Promise<RecipePage> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": browserUserAgent, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(fetchTimeout),
    });
  } catch {
    throw new PageError("Could not open that link. Check it and try again.");
  }
  if (!response.ok) {
    throw new PageError(
      // Sites that block automated visitors answer with one of these.
      [401, 402, 403, 429].includes(response.status)
        ? "That site does not allow importing. Try a photo of the recipe instead."
        : "Could not open that link. Check it and try again.",
    );
  }
  if (!response.headers.get("content-type")?.includes("html")) {
    throw new PageError("That link is not a web page.");
  }
  const html = new TextDecoder().decode(await readLimited(response, maxPageBytes));
  return readRecipePage(html, response.url || url.toString());
}

export async function readRecipePage(html: string, url: string): Promise<RecipePage> {
  const structuredData: string[] = [];
  let script = "";
  let documentTitle = "";
  let ogTitle: string | null = null;
  let ogImage: string | null = null;

  const cleaned = await new HTMLRewriter()
    .on('script[type="application/ld+json"]', {
      text(chunk) {
        script += chunk.text;
        if (!chunk.lastInTextNode) return;
        if (/recipe/iu.test(script)) structuredData.push(script.trim());
        script = "";
      },
    })
    .on("title", {
      text(chunk) {
        documentTitle += chunk.text;
      },
    })
    .on('meta[property="og:title"]', {
      element(element) {
        ogTitle ??= element.getAttribute("content");
      },
    })
    .on('meta[property="og:image"], meta[property="og:image:secure_url"]', {
      element(element) {
        ogImage ??= element.getAttribute("content");
      },
    })
    .on(`head, ${skippedElements}`, {
      element(element) {
        element.remove();
      },
    })
    .transform(new Response(html))
    .text();

  // Attribute and title text arrive as written in the HTML, entities and all.
  const title = ogTitle ?? (documentTitle.trim() || null);
  return {
    url,
    title: title ? decodeEntities(title).trim() : null,
    imageUrl: ogImage ? absoluteUrl(decodeEntities(ogImage), url) : null,
    structuredData,
    text: htmlToText(cleaned).slice(0, maxTextLength),
  };
}

// Plain text with a line per block, which keeps ingredient lists and steps apart.
export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/gu, "")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)\b[^>]*>/giu, "\n")
      .replace(/<li\b[^>]*>/giu, "\n- ")
      .replace(/<[^>]+>/gu, " "),
  )
    .split("\n")
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .join("\n");
}

const namedEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  aring: "å",
  auml: "ä",
  ouml: "ö",
  Aring: "Å",
  Auml: "Ä",
  Ouml: "Ö",
  eacute: "é",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  deg: "°",
};

function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]\w*);/giu, (entity, name: string) => {
    if (name.startsWith("#x") || name.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    }
    if (name.startsWith("#")) return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
    return namedEntities[name] ?? namedEntities[name.toLowerCase()] ?? entity;
  });
}

function absoluteUrl(value: string, base: string) {
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

// Reads at most maxBytes of a body, so a huge or endless response cannot exhaust the Worker's
// memory.
export async function readLimited(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  await reader.cancel();
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.subarray(0, maxBytes);
}

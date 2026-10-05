import { describe, expect, test } from "bun:test";

import { htmlToText, parseRecipeUrl, readRecipePage } from "./page";

const html = `<!doctype html>
<html>
  <head>
    <title>Best Ever Pancakes Recipe | Site</title>
    <meta property="og:title" content="Best Ever Pancakes">
    <meta property="og:image" content="/images/pancakes.jpg">
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Recipe","name":"Pancakes"}</script>
    <script type="application/ld+json">{"@type":"Organization","name":"Site"}</script>
    <style>p { color: red }</style>
  </head>
  <body>
    <nav>Home · Recipes</nav>
    <h1>Pancakes</h1>
    <p>Fluffy &amp; quick &frac12; batch.</p>
    <ul><li>2 cups flour</li><li>1 egg</li></ul>
    <script>trackVisitor()</script>
    <form><button>Subscribe</button></form>
    <footer>© Site</footer>
  </body>
</html>`;

describe("readRecipePage", () => {
  test("keeps the recipe text and drops the page chrome", async () => {
    const page = await readRecipePage(html, "https://example.com/pancakes");
    expect(page.text).toBe("Pancakes\nFluffy & quick ½ batch.\n- 2 cups flour\n- 1 egg");
  });

  test("reads the shared title and image, and only recipe structured data", async () => {
    const page = await readRecipePage(html, "https://example.com/pancakes");
    expect(page.title).toBe("Best Ever Pancakes");
    expect(page.imageUrl).toBe("https://example.com/images/pancakes.jpg");
    expect(page.structuredData).toEqual([
      '{"@context":"https://schema.org","@type":"Recipe","name":"Pancakes"}',
    ]);
  });

  test("decodes entities in the shared title and image", async () => {
    const page = await readRecipePage(
      '<meta property="og:title" content="K&#xF6;ttbullar &amp; s&aring;s"><meta property="og:image" content="/i.jpg?w=1&amp;h=2">',
      "https://example.com",
    );
    expect(page.title).toBe("Köttbullar & sås");
    expect(page.imageUrl).toBe("https://example.com/i.jpg?w=1&h=2");
  });

  test("falls back to the document title", async () => {
    const page = await readRecipePage("<title> Soup </title><p>Soup</p>", "https://example.com");
    expect(page.title).toBe("Soup");
    expect(page.imageUrl).toBeNull();
  });
});

describe("htmlToText", () => {
  test("decodes numeric entities", () => {
    expect(htmlToText("<p>200&#176;C &#x2013; 20 min</p>")).toBe("200°C – 20 min");
  });
});

describe("parseRecipeUrl", () => {
  test("accepts web links only", () => {
    expect(parseRecipeUrl(" https://example.com/a ")?.toString()).toBe("https://example.com/a");
    expect(parseRecipeUrl("javascript:alert(1)")).toBeNull();
    expect(parseRecipeUrl("not a url")).toBeNull();
  });
});

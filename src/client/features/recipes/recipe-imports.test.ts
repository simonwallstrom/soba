import { describe, expect, test } from "bun:test";

import { importedRecipeEvents, importHost } from "./recipe-imports";

const at = new Date("2026-10-05T12:00:00Z");
const tags = [
  { id: "tag-1", name: "Frukost", createdAt: at, deletedAt: null },
  { id: "tag-2", name: "Middag", createdAt: at, deletedAt: null },
];
const recipe = {
  title: "Pannkakor",
  description: "",
  servings: null,
  ingredients: [{ items: ["3 dl vetemjöl"] }],
  instructions: [{ items: ["Vispa ihop."] }],
  tags: ["frukost", "Gone"],
};

describe("importedRecipeEvents", () => {
  test("saves the recipe under the import's ID with the household's matching tags", () => {
    const events = importedRecipeEvents(
      { recipe, sourceUrl: "https://www.ica.se/recept/pannkakor/", photoId: null },
      { id: "import-1", tags, userId: "anna", at },
    );
    expect(events.map((event) => event.name)).toEqual(["v1.RecipeCreated"]);
    expect(events[0]?.args).toEqual({
      id: "import-1",
      title: "Pannkakor",
      sourceUrl: "https://www.ica.se/recept/pannkakor/",
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      tagIds: ["tag-1"],
      createdBy: "anna",
      createdAt: at,
    });
  });

  test("adds the page's photo", () => {
    const events = importedRecipeEvents(
      { recipe, sourceUrl: null, photoId: "photo-1" },
      { id: "import-1", tags, userId: "anna", at },
    );
    expect(events.map((event) => event.name)).toEqual([
      "v1.RecipeCreated",
      "v1.RecipePhotoChanged",
    ]);
    expect(events[1]?.args).toMatchObject({ id: "import-1", photoId: "photo-1" });
  });
});

describe("importHost", () => {
  test("names the site without www", () => {
    expect(importHost("https://www.ica.se/recept/x/")).toBe("ica.se");
    expect(importHost(null)).toBeNull();
  });
});

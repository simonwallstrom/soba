import { describe, expect, test } from "bun:test";

import type { Recipe, Tag } from "@shared/recipes";

import { filterRecipes, parseRecipeListSearch } from "./-recipe-list";

function recipe(id: string, title: string, overrides: Partial<Recipe> = {}): Recipe {
  const date = new Date("2026-01-01T00:00:00Z");
  return {
    id,
    title,
    description: null,
    servings: null,
    imageUrl: null,
    ingredients: [],
    instructions: [],
    createdBy: "anna",
    updatedBy: "anna",
    createdAt: date,
    updatedAt: date,
    deletedAt: null,
    ...overrides,
  };
}

function tag(id: string): Tag {
  return { id, name: id, createdAt: new Date(), deletedAt: null };
}

describe("filterRecipes", () => {
  const pasta = recipe("pasta", "Pasta carbonara");
  const buns = recipe("buns", "Kanelbullar");
  const omelette = recipe("omelette", "Äggomelett");
  const tagsByRecipe = new Map([
    ["pasta", [tag("italian"), tag("quick")]],
    ["buns", [tag("baking")]],
  ]);

  test("sorts by title in Swedish order", () => {
    const titles = filterRecipes([omelette, pasta, buns], tagsByRecipe, {}, "name").map(
      (item) => item.title,
    );
    expect(titles).toEqual(["Kanelbullar", "Pasta carbonara", "Äggomelett"]);
  });

  test("matches any selected tag", () => {
    const ids = filterRecipes(
      [omelette, pasta, buns],
      tagsByRecipe,
      { tags: ["quick", "baking"] },
      "name",
    ).map((item) => item.id);
    expect(ids).toEqual(["buns", "pasta"]);
  });

  test("matches every field with a selection", () => {
    const simons = recipe("simons", "Pasta pomodoro", { createdBy: "simon" });
    const filters = { tags: ["italian", "baking"], authors: ["anna"] };
    const ids = filterRecipes([pasta, buns, simons], tagsByRecipe, filters, "name").map(
      (item) => item.id,
    );
    expect(ids).toEqual(["buns", "pasta"]);
  });

  test("matches any selected author", () => {
    const simons = recipe("simons", "Pasta pomodoro", { createdBy: "simon" });
    const leos = recipe("leos", "Pannkakor", { createdBy: "leo" });
    const filters = { authors: ["simon", "leo"] };
    const ids = filterRecipes([pasta, simons, leos], tagsByRecipe, filters, "name").map(
      (item) => item.id,
    );
    expect(ids).toEqual(["leos", "simons"]);
  });

  test("searches titles and descriptions, ignoring case and surrounding spaces", () => {
    const soup = recipe("soup", "Tomatsoppa", { description: "Med PASTA-bokstäver" });
    const ids = filterRecipes([pasta, buns, soup], tagsByRecipe, { q: " pasta " }, "name").map(
      (item) => item.id,
    );
    expect(ids).toEqual(["pasta", "soup"]);
  });

  test("searches tag names and ingredient lines", () => {
    const pie = recipe("pie", "Paj", {
      ingredients: [{ heading: "Deg", items: ["3 dl vetemjöl", "125 g smör"] }],
    });
    const search = (q: string) =>
      filterRecipes([pasta, buns, pie], tagsByRecipe, { q }, "name").map((item) => item.id);
    expect(search("baking")).toEqual(["buns"]);
    expect(search("smör")).toEqual(["pie"]);
  });

  test("sorts newest first, then by title", () => {
    const newer = recipe("newer", "Zucchinisoppa", { createdAt: new Date("2026-02-01") });
    const ids = filterRecipes([pasta, newer, buns], tagsByRecipe, {}, "created").map(
      (item) => item.id,
    );
    expect(ids).toEqual(["newer", "buns", "pasta"]);
  });
});

describe("parseRecipeListSearch", () => {
  test("keeps valid filters", () => {
    expect(parseRecipeListSearch({ tags: ["a", "a", 1] })).toEqual({ tags: ["a"] });
  });

  test("accepts a single tag and ignores unknown params", () => {
    expect(parseRecipeListSearch({ tags: "a", addedBy: "anna", sort: "name" })).toEqual({
      tags: ["a"],
    });
  });

  test("drops an empty tag list", () => {
    expect(parseRecipeListSearch({ tags: [] })).toEqual({});
  });

  test("keeps the search as typed and drops a blank one", () => {
    expect(parseRecipeListSearch({ q: "pasta " })).toEqual({ q: "pasta " });
    expect(parseRecipeListSearch({ q: "  " })).toEqual({});
  });

  test("keeps authors", () => {
    expect(parseRecipeListSearch({ authors: ["anna", "anna"], tags: "a" })).toEqual({
      tags: ["a"],
      authors: ["anna"],
    });
  });
});

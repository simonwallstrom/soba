import { describe, expect, test } from "bun:test";

import type { Tag } from "@shared/recipes";

import { topTags } from "./recipe-tags";

function makeTag(id: string, name: string): Tag {
  return { id, name, createdAt: new Date(0), deletedAt: null };
}

const pasta = makeTag("pasta", "Pasta");
const potato = makeTag("potato", "Potato");
const rice = makeTag("rice", "Rice");
const fish = makeTag("fish", "Fish");

describe("topTags", () => {
  test("orders by recipe count, then by name, and leaves out unused tags", () => {
    const links = [
      { recipeId: "r1", tagId: "rice" },
      { recipeId: "r2", tagId: "pasta" },
      { recipeId: "r3", tagId: "pasta" },
      { recipeId: "r1", tagId: "potato" },
    ];
    const result = topTags([rice, pasta, potato, fish], links, new Set(["r1", "r2", "r3"]), 5);
    expect(result.map(({ tag, count }) => [tag.name, count])).toEqual([
      ["Pasta", 2],
      ["Potato", 1],
      ["Rice", 1],
    ]);
  });

  test("counts only live recipes and stops at the limit", () => {
    const links = [
      { recipeId: "deleted", tagId: "fish" },
      { recipeId: "r1", tagId: "pasta" },
      { recipeId: "r1", tagId: "rice" },
    ];
    const result = topTags([pasta, rice, fish], links, new Set(["r1"]), 1);
    expect(result.map(({ tag }) => tag.name)).toEqual(["Pasta"]);
  });
});

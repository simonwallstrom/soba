import { describe, expect, test } from "bun:test";

import type { Recipe } from "@shared/recipes";

import { guessProfile } from "./recipe-profile";

const at = new Date(2026, 9, 7);

function entry(title: string, tagNames: readonly string[] = []) {
  const recipe: Recipe = {
    id: title,
    title,
    description: null,
    servings: null,
    imageUrl: null,
    sourceUrl: null,
    ingredients: [],
    instructions: [],
    createdBy: "u1",
    updatedBy: "u1",
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
  };
  const tags = tagNames.map((name) => ({ id: name, name, createdAt: at, deletedAt: null }));
  return { recipe, tags, author: undefined };
}

describe("guessProfile", () => {
  test("reads base and protein from the title", () => {
    expect(guessProfile(entry("Laxfilé med dillpotatis"))).toMatchObject({
      isDinner: true,
      base: "potato",
      protein: "fish",
    });
  });

  test("keeps savory pies as dinner, on a bread base", () => {
    expect(guessProfile(entry("Skinkpaj med purjolök"))).toMatchObject({
      isDinner: true,
      base: "bread",
      protein: "pork",
    });
  });

  test("leaves out sweet pies and baking", () => {
    expect(guessProfile(entry("Äppelpaj med havrecrunch")).isDinner).toBe(false);
    expect(guessProfile(entry("Blåbärspaj")).isDinner).toBe(false);
    expect(guessProfile(entry("Apple pie")).isDinner).toBe(false);
    expect(guessProfile(entry("Mormors kanelbullar")).isDinner).toBe(false);
    expect(guessProfile(entry("Kladdkaka")).isDinner).toBe(false);
  });

  test("keeps pancakes as dinner", () => {
    expect(guessProfile(entry("Pannkakor")).isDinner).toBe(true);
  });

  test("takes effort from the household's tags", () => {
    expect(guessProfile(entry("Pasta", ["Quick"])).effort).toBe("quick");
    expect(guessProfile(entry("Pasta")).effort).toBe("normal");
  });
});

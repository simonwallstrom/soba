import { describe, expect, test } from "bun:test";

import { scaleIngredient } from "./scale-ingredient";

function scaled(line: string, factor: number, decimalSeparator = ",") {
  const { amount, rest } = scaleIngredient(line, factor, decimalSeparator);
  return `${amount ?? ""}${rest}`;
}

describe("scaleIngredient", () => {
  test("leaves lines unchanged at the original servings", () => {
    expect(scaleIngredient("2 dl mjölk", 1, ",")).toEqual({ amount: null, rest: "2 dl mjölk" });
  });

  test("scales whole numbers and keeps the rest as written", () => {
    expect(scaleIngredient("2 dl mjölk", 2, ",")).toEqual({ amount: "4", rest: " dl mjölk" });
    expect(scaled("500g blandfärs", 2)).toBe("1000g blandfärs");
  });

  test("leaves lines without a leading amount", () => {
    expect(scaleIngredient("Salt efter smak", 2, ",")).toEqual({
      amount: null,
      rest: "Salt efter smak",
    });
    expect(scaled("Färsk basilika till servering", 0.5)).toBe("Färsk basilika till servering");
  });

  test("keeps decimals as decimals, in the household's notation", () => {
    expect(scaled("2,5 dl vetemjöl", 1.5)).toBe("3,8 dl vetemjöl");
    expect(scaled("1.5 kg potatoes", 2, ".")).toBe("3 kg potatoes");
    expect(scaled("2,5 dl vetemjöl", 0.5)).toBe("1,3 dl vetemjöl");
  });

  test("reads and writes common fractions", () => {
    expect(scaled("1½ dl mjölk", 2)).toBe("3 dl mjölk");
    expect(scaled("½ citron", 3)).toBe("1½ citron");
    expect(scaled("1/2 tsk salt", 0.5)).toBe("¼ tsk salt");
    expect(scaled("1 gul lök", 0.5)).toBe("½ gul lök");
    expect(scaled("2 ägg", 1 / 3)).toBe("⅔ ägg");
    expect(scaled("1 krm muskot", 0.1)).toBe("⅛ krm muskot");
  });

  test("keeps the space in US-style mixed numbers", () => {
    expect(scaled("1 1/2 cups flour", 1.5, ".")).toBe("2 ¼ cups flour");
    expect(scaled("1 ½ tbsp butter", 3, ".")).toBe("4 ½ tbsp butter");
  });

  test("scales both ends of a range", () => {
    expect(scaled("2–3 vitlöksklyftor", 2)).toBe("4–6 vitlöksklyftor");
    expect(scaled("1-2 tsk chili", 1.5)).toBe("1½-3 tsk chili");
  });

  test("scales only the count of packs", () => {
    expect(scaled("2 x 400 g krossade tomater", 1.5)).toBe("3 x 400 g krossade tomater");
    expect(scaled("1 burk kokosmjölk à 400 ml", 2)).toBe("2 burk kokosmjölk à 400 ml");
  });

  test("rounds large amounts like a cookbook", () => {
    expect(scaled("150 g guanciale", 1.5)).toBe("225 g guanciale");
    expect(scaled("600 g laxfilé", 1.25)).toBe("750 g laxfilé");
    expect(scaled("450 g pasta", 0.75)).toBe("340 g pasta");
    expect(scaled("12 lasagneplattor", 0.75)).toBe("9 lasagneplattor");
  });
});

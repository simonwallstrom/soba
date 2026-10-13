import { expect, test } from "bun:test";

import { cookingProgress } from "./cooking-session";

function recipe(id: string, ...steps: string[]) {
  return { id, instructions: [{ items: steps }] };
}

function session(done: string[], updatedAt: number, checked: string[] = []) {
  return { servings: null, checked, done, updatedAt };
}

test("lists recipes with marks, most recently touched first, with their steps done", () => {
  const progress = cookingProgress(
    [recipe("soba", "Boil", "Rinse", "Serve"), recipe("ramen", "Simmer"), recipe("stew", "Stir")],
    {
      // A step that was since edited away no longer counts.
      soba: session(["Boil", "Drain"], 1),
      ramen: session([], 2, ["Noodles"]),
    },
  );
  expect(
    progress.map(({ recipe: { id }, doneCount, stepCount }) => [id, doneCount, stepCount]),
  ).toEqual([
    ["ramen", 0, 1],
    ["soba", 1, 3],
  ]);
});

test("leaves out recipes that are finished or only scaled", () => {
  const progress = cookingProgress([recipe("soba", "Boil"), recipe("ramen", "Simmer")], {
    soba: session(["Boil"], 1),
    ramen: { ...session([], 2), servings: 8 },
  });
  expect(progress).toEqual([]);
});

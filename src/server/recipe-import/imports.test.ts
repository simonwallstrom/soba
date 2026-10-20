import { expect, mock, test } from "bun:test";

import { addHousehold, createMemoryDatabase } from "../../../scripts/testing/memory-database";

const { sqlite, db } = createMemoryDatabase();
addHousehold(sqlite, "h1", ["alice", "bob"]);

await mock.module(new URL("../db/client.ts", import.meta.url).pathname, () => ({
  getDatabase: () => db,
}));
const { insertImport, saveImportedRecipe } = await import("./imports");

const recipe = {
  title: "Pancakes",
  description: "",
  servings: 4,
  ingredients: [],
  instructions: [],
  tags: [],
};

async function importRecipe(id: string, userId: string) {
  await insertImport({ id, householdId: "h1", userId, kind: "page", status: "writing", runId: id });
  await saveImportedRecipe(id, recipe);
}

function favoriteIds(userId: string) {
  return sqlite
    .query<{ recipe_id: string }, [string]>("SELECT recipe_id FROM favorite WHERE user_id = ?")
    .all(userId)
    .map((row) => row.recipe_id);
}

test("the household's first recipe, imported, becomes the importer's favorite", async () => {
  await importRecipe("r1", "bob");
  expect(favoriteIds("bob")).toEqual(["r1"]);
  expect(favoriteIds("alice")).toEqual([]);

  // Saving it again changes nothing.
  await saveImportedRecipe("r1", recipe);
  expect(favoriteIds("bob")).toEqual(["r1"]);
});

test("later imports aren't favorited", async () => {
  await importRecipe("r2", "alice");
  expect(favoriteIds("alice")).toEqual([]);
});

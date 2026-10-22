import { describe, expect, mock, test } from "bun:test";

import type { ExecutionContext } from "hono";

import { addHousehold, createMemoryDatabase } from "../../../scripts/testing/memory-database";

const { sqlite, db } = createMemoryDatabase();
addHousehold(sqlite, "h1", ["alice", "bob"]);
addHousehold(sqlite, "h2", ["stranger"]);

// Members sign in with the cookie "user=<id>".
await mock.module(new URL("../auth/auth.ts", import.meta.url).pathname, () => ({
  getSession: async (headers: Headers) => {
    const id = headers.get("cookie")?.match(/user=(\w+)/u)?.[1];
    return id ? { user: { id } } : null;
  },
}));
await mock.module(new URL("../db/client.ts", import.meta.url).pathname, () => ({
  getDatabase: () => db,
}));
const { recipeRoutes } = await import("./routes");
const { mealPlanRoutes } = await import("../meal-plan/routes");
const { claimImport, saveImportedRecipe } = await import("../recipe-import/imports");
const { purgeDeletedRecipes } = await import("./recipes");

type Routes = {
  request: (
    path: string,
    init: RequestInit,
    env: object,
    executionCtx: ExecutionContext,
  ) => Response | Promise<Response>;
};

// Photo keys the routes deleted from the bucket.
const deletedPhotos: string[] = [];
// Just the bindings the routes reach.
const env = {
  PHOTOS: {
    delete: async (keys: string[]) => void deletedPhotos.push(...keys),
  },
};

const background: Promise<unknown>[] = [];
const executionCtx: ExecutionContext = {
  waitUntil: (promise: Promise<unknown>) => void background.push(promise),
  passThroughOnException: () => {},
  props: {},
};

// Waits for the work the routes left running after they answered.
async function settled() {
  await Promise.all(background.splice(0));
}

function send(routes: Routes, user: string, method: string, path: string, json?: unknown) {
  return routes.request(
    path,
    {
      method,
      headers: { cookie: `user=${user}`, "Content-Type": "application/json" },
      ...(json === undefined ? {} : { body: JSON.stringify(json) }),
    },
    env,
    executionCtx,
  );
}

type Collection = {
  recipes: {
    id: string;
    title: string;
    description: string | null;
    servings: number | null;
    imageUrl: string | null;
    tagIds: string[];
    updatedBy: string;
  }[];
  deletedRecipes: { id: string; deletedBy: string }[];
  tags: { id: string; name: string }[];
  favoriteIds: string[];
};

async function collection(user: string) {
  const response = await send(recipeRoutes, user, "GET", "/");
  // The response's shape is what these tests check.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await response.json()) as Collection;
}

async function plan(user: string) {
  const response = await send(mealPlanRoutes, user, "GET", "/");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const body = (await response.json()) as {
    meals: { date: string; recipeId: string; plannedBy: string }[];
  };
  return body.meals
    .map(({ date, recipeId, plannedBy }) => day(date, recipeId, plannedBy))
    .toSorted((left, right) => left.localeCompare(right));
}

// Days are listed with who planned them, which moving keeps.
function day(date: string, recipeId: string, plannedBy = "alice") {
  return `${date} ${recipeId} ${plannedBy}`;
}

function meals(...days: [string, string][]) {
  return { meals: days.map(([date, recipeId]) => ({ date, recipeId })) };
}

const soba = "00000000-0000-4000-8000-000000000001";
const ramen = "00000000-0000-4000-8000-000000000002";
const noodles = "00000000-0000-4000-8000-0000000000a1";
const quick = "00000000-0000-4000-8000-0000000000a2";
const photo = "00000000-0000-4000-8000-0000000000f1";

const fields = { ingredients: [{ items: ["Soba"] }], instructions: [], tagIds: [] };

describe("recipe routes", () => {
  test("a new recipe is saved with the new tags it uses, for the whole household", async () => {
    const response = await send(recipeRoutes, "alice", "POST", "/", {
      ...fields,
      id: soba,
      title: " Soba ",
      description: "Cold",
      servings: 2,
      photoId: photo,
      tagIds: [noodles, quick],
      newTags: [{ id: noodles, name: "nudlar  och sånt" }],
    });
    expect(response.status).toBe(201);
    const { recipes, tags } = await collection("bob");
    expect(tags).toMatchObject([{ id: noodles, name: "Nudlar och sånt" }]);
    expect(recipes).toMatchObject([
      {
        id: soba,
        title: "Soba",
        description: "Cold",
        servings: 2,
        imageUrl: `/api/photos/${photo}`,
        // A tag that is neither new nor the household's own is dropped.
        tagIds: [noodles],
      },
    ]);
  });

  test("saving the same recipe twice is refused", async () => {
    const response = await send(recipeRoutes, "bob", "POST", "/", {
      ...fields,
      id: soba,
      title: "Again",
    });
    expect(response.status).toBe(409);
  });

  test("an update replaces the recipe's text, details and tags, and keeps its photo", async () => {
    const response = await send(recipeRoutes, "bob", "PUT", `/${soba}`, {
      ...fields,
      title: "Cold soba",
      tagIds: [quick],
      newTags: [{ id: quick, name: "Quick" }],
    });
    expect(response.status).toBe(200);
    const { recipes, tags } = await collection("alice");
    expect(recipes).toMatchObject([
      {
        title: "Cold soba",
        description: null,
        servings: null,
        imageUrl: `/api/photos/${photo}`,
        tagIds: [quick],
        updatedBy: "bob",
      },
    ]);
    expect(tags.map((tag) => tag.name).toSorted()).toEqual(["Nudlar och sånt", "Quick"]);

    await settled();
    expect(deletedPhotos).toEqual([]);
    await send(recipeRoutes, "bob", "PUT", `/${soba}`, {
      ...fields,
      title: "Cold soba",
      photoId: null,
    });
    expect((await collection("alice")).recipes[0]?.imageUrl).toBeNull();
    // A photo the recipe no longer uses is removed from the bucket.
    await settled();
    expect(deletedPhotos).toEqual([`households/h1/photos/${photo}`]);
  });

  test("favorites belong to the member who added them, newest first", async () => {
    await send(recipeRoutes, "alice", "POST", "/", { ...fields, id: ramen, title: "Ramen" });
    await send(recipeRoutes, "alice", "PUT", `/${soba}/favorite`);
    await send(recipeRoutes, "alice", "PUT", `/${soba}/favorite`);
    await Bun.sleep(2);
    await send(recipeRoutes, "alice", "PUT", `/${ramen}/favorite`);
    expect((await collection("alice")).favoriteIds).toEqual([ramen, soba]);
    expect((await collection("bob")).favoriteIds).toEqual([]);
    await send(recipeRoutes, "alice", "DELETE", `/${ramen}/favorite`);
    expect((await collection("alice")).favoriteIds).toEqual([soba]);
  });

  test("another household can't see or change the recipes", async () => {
    expect((await collection("stranger")).recipes).toEqual([]);
    const update = { ...fields, title: "Mine now" };
    expect((await send(recipeRoutes, "stranger", "PUT", `/${soba}`, update)).status).toBe(404);
    expect((await send(recipeRoutes, "stranger", "DELETE", `/${soba}`)).status).toBe(404);
    expect((await send(recipeRoutes, "stranger", "PUT", `/${soba}/favorite`)).status).toBe(404);
    expect((await collection("alice")).recipes.map((recipe) => recipe.title).toSorted()).toEqual([
      "Cold soba",
      "Ramen",
    ]);
    expect((await send(recipeRoutes, "", "GET", "/")).status).toBe(401);
  });
});

describe("meal plan routes", () => {
  test("a day holds one dinner, and the last plan wins", async () => {
    await send(mealPlanRoutes, "alice", "PUT", "/", meals(["2026-10-12", soba]));
    const response = await send(
      mealPlanRoutes,
      "bob",
      "PUT",
      "/",
      meals(["2026-10-12", ramen], ["2026-10-13", soba]),
    );
    expect(response.status).toBe(200);
    expect(await plan("alice")).toEqual([
      day("2026-10-12", ramen, "bob"),
      day("2026-10-13", soba, "bob"),
    ]);
  });

  test("moving a meal onto a planned day swaps the two, and onto an open day frees its own", async () => {
    await send(mealPlanRoutes, "alice", "POST", "/move", { from: "2026-10-12", to: "2026-10-13" });
    expect(await plan("alice")).toEqual([
      day("2026-10-12", soba, "bob"),
      day("2026-10-13", ramen, "bob"),
    ]);
    await send(mealPlanRoutes, "alice", "POST", "/move", { from: "2026-10-13", to: "2026-10-15" });
    await send(mealPlanRoutes, "alice", "POST", "/move", { from: "2026-10-20", to: "2026-10-12" });
    expect(await plan("alice")).toEqual([
      day("2026-10-12", soba, "bob"),
      day("2026-10-15", ramen, "bob"),
    ]);
  });

  test("another household's recipes can't be planned, and its plan stays its own", async () => {
    const response = await send(
      mealPlanRoutes,
      "stranger",
      "PUT",
      "/",
      meals(["2026-10-12", soba]),
    );
    expect(response.status).toBe(404);
    await send(mealPlanRoutes, "stranger", "POST", "/remove", { dates: ["2026-10-12"] });
    expect(await plan("stranger")).toEqual([]);
    expect(await plan("alice")).toHaveLength(2);
  });

  test("unplanning clears the days, and a deleted recipe's meals hide until it's restored", async () => {
    await send(mealPlanRoutes, "alice", "POST", "/remove", { dates: ["2026-10-15"] });
    expect(await plan("alice")).toEqual([day("2026-10-12", soba, "bob")]);
    expect((await send(recipeRoutes, "bob", "DELETE", `/${soba}`)).status).toBe(200);
    expect(await plan("alice")).toEqual([]);
    const deleted = await collection("alice");
    expect(deleted.recipes.map((recipe) => recipe.id)).toEqual([ramen]);
    expect(deleted.deletedRecipes).toMatchObject([{ id: soba, deletedBy: "bob" }]);
    // Kept for a restore.
    expect(deleted.favoriteIds).toEqual([soba]);

    // Hidden from everything that changes recipes, but another household still can't reach it.
    expect((await send(recipeRoutes, "alice", "PUT", `/${soba}/favorite`)).status).toBe(404);
    expect(
      (await send(mealPlanRoutes, "alice", "PUT", "/", meals(["2026-10-20", soba]))).status,
    ).toBe(404);
    expect((await send(recipeRoutes, "stranger", "POST", `/${soba}/restore`)).status).toBe(404);

    expect((await send(recipeRoutes, "alice", "POST", `/${soba}/restore`)).status).toBe(200);
    expect(await plan("alice")).toEqual([day("2026-10-12", soba, "bob")]);
    const restored = await collection("alice");
    expect(restored.recipes.map((recipe) => recipe.id).toSorted()).toEqual([soba, ramen]);
    expect(restored.deletedRecipes).toEqual([]);
  });

  test("a hidden meal counts as an open day when moving onto it", async () => {
    await send(mealPlanRoutes, "alice", "PUT", "/", meals(["2026-10-13", ramen]));
    await send(recipeRoutes, "alice", "DELETE", `/${soba}`);
    await send(mealPlanRoutes, "alice", "POST", "/move", { from: "2026-10-13", to: "2026-10-12" });
    await send(recipeRoutes, "alice", "POST", `/${soba}/restore`);
    expect(await plan("alice")).toEqual([day("2026-10-12", ramen)]);
  });

  test("deleting for good takes the recipe's meals and favorites", async () => {
    await send(mealPlanRoutes, "alice", "PUT", "/", meals(["2026-10-14", soba]));
    expect((await send(recipeRoutes, "alice", "DELETE", `/${soba}/permanently`)).status).toBe(200);
    expect((await send(recipeRoutes, "alice", "POST", `/${soba}/restore`)).status).toBe(404);
    expect(await plan("alice")).toEqual([day("2026-10-12", ramen)]);
    const { recipes, deletedRecipes, favoriteIds } = await collection("alice");
    expect(recipes.map((recipe) => recipe.id)).toEqual([ramen]);
    expect(deletedRecipes).toEqual([]);
    expect(favoriteIds).toEqual([]);
  });
});

describe("recipe imports", () => {
  const imported = "00000000-0000-4000-8000-000000000004";
  const cover = "00000000-0000-4000-8000-0000000000f2";
  const secondPage = "00000000-0000-4000-8000-0000000000f3";
  const recipe = {
    title: "Kimchi stew",
    description: "",
    servings: 4,
    ingredients: [{ items: ["Kimchi"] }],
    instructions: [{ items: ["Simmer"] }],
    tags: ["quick", "Unknown"],
  };

  test("a finished import is saved for the household before any app asks for it", async () => {
    sqlite.run(
      "INSERT INTO recipe_import (id, household_id, user_id, kind, status, source_photo_ids, photo_id, run_id) VALUES (?, 'h1', 'alice', 'photos', 'writing', ?, ?, 'run')",
      [imported, JSON.stringify([cover, secondPage]), cover],
    );
    const saved = await saveImportedRecipe(imported, recipe);
    // Saving again, as a retried step would, changes nothing.
    await saveImportedRecipe(imported, recipe);
    expect(saved).toEqual({ householdId: "h1", unusedPhotoIds: [secondPage] });

    const { recipes, tags } = await collection("bob");
    const quickTag = tags.find((tag) => tag.name === "Quick");
    expect(recipes.filter((other) => other.id === imported)).toMatchObject([
      { title: "Kimchi stew", imageUrl: `/api/photos/${cover}`, tagIds: [quickTag?.id] },
    ]);
  });

  test("only the importer announces it, once, and the recipe stays", async () => {
    expect(await claimImport(imported, "bob")).toBeNull();
    expect(await claimImport(imported, "alice")).toEqual({ title: "Kimchi stew" });
    expect(await claimImport(imported, "alice")).toBeNull();
    expect((await collection("alice")).recipes.some((other) => other.id === imported)).toBe(true);
  });

  test("an import dismissed while it ran saves nothing", async () => {
    expect(await saveImportedRecipe("00000000-0000-4000-8000-000000000005", recipe)).toBeNull();
  });

  test("deleting the recipe keeps its photo for a restore, and deleting it for good removes it", async () => {
    deletedPhotos.length = 0;
    await send(recipeRoutes, "alice", "DELETE", `/${imported}`);
    await settled();
    expect(deletedPhotos).toEqual([]);
    await send(recipeRoutes, "alice", "DELETE", `/${imported}/permanently`);
    await settled();
    expect(deletedPhotos).toEqual([`households/h1/photos/${cover}`]);
  });
});

describe("purging deleted recipes", () => {
  test("removes only recipes deleted 30 days ago or more", async () => {
    const old = "00000000-0000-4000-8000-000000000006";
    const recent = "00000000-0000-4000-8000-000000000007";
    const now = Date.UTC(2026, 9, 31);
    for (const [id, daysAgo] of [
      [old, 31],
      [recent, 29],
    ] as const) {
      sqlite.run(
        "INSERT INTO recipe (id, household_id, title, ingredients, instructions, image_url, created_by, updated_by, deleted_at, deleted_by) VALUES (?, 'h1', 'Old', '[]', '[]', ?, 'alice', 'alice', ?, 'alice')",
        [id, `/api/photos/${photo}`, now - daysAgo * 86_400_000],
      );
    }
    expect(await purgeDeletedRecipes(now)).toEqual([
      { householdId: "h1", imageUrl: `/api/photos/${photo}` },
    ]);
    const { recipes, deletedRecipes } = await collection("alice");
    expect(deletedRecipes.map((recipe) => recipe.id)).toEqual([recent]);
    expect(recipes.map((recipe) => recipe.id)).toEqual([ramen]);
  });
});

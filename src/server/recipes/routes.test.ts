import { describe, expect, mock, test } from "bun:test";

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

type Routes = {
  request: (path: string, init: RequestInit, env: object) => Response | Promise<Response>;
};

// Just the binding the routes reach before they answer.
const env = { PROFILE_RATE_LIMITER: { limit: async () => ({ success: true }) } };

function send(routes: Routes, user: string, method: string, path: string, json?: unknown) {
  return routes.request(
    path,
    {
      method,
      headers: { cookie: `user=${user}`, "Content-Type": "application/json" },
      ...(json === undefined ? {} : { body: JSON.stringify(json) }),
    },
    env,
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
    meals: { date: string; recipeId: string; suggestionId: string | null }[];
  };
  return body.meals
    .map(({ date, recipeId, suggestionId }) => day(date, recipeId, suggestionId))
    .toSorted((left, right) => left.localeCompare(right));
}

function day(date: string, recipeId: string, suggestionId: string | null = null) {
  return `${date} ${recipeId} ${suggestionId}`;
}

function meals(...days: [string, string, string?][]) {
  return {
    meals: days.map(([date, recipeId, suggestionId]) => ({
      date,
      recipeId,
      ...(suggestionId ? { suggestionId } : {}),
    })),
  };
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

    await send(recipeRoutes, "bob", "PUT", `/${soba}`, {
      ...fields,
      title: "Cold soba",
      photoId: null,
    });
    expect((await collection("alice")).recipes[0]?.imageUrl).toBeNull();
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
    expect((await send(recipeRoutes, "stranger", "POST", `/${soba}/profile`)).status).toBe(404);
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
      meals(["2026-10-12", ramen, "s1"], ["2026-10-13", soba]),
    );
    expect(response.status).toBe(200);
    expect(await plan("alice")).toEqual([day("2026-10-12", ramen, "s1"), day("2026-10-13", soba)]);
  });

  test("moving a meal onto a planned day swaps the two, and onto an open day frees its own", async () => {
    await send(mealPlanRoutes, "alice", "POST", "/move", { from: "2026-10-12", to: "2026-10-13" });
    expect(await plan("alice")).toEqual([day("2026-10-12", soba), day("2026-10-13", ramen, "s1")]);
    await send(mealPlanRoutes, "alice", "POST", "/move", { from: "2026-10-13", to: "2026-10-15" });
    await send(mealPlanRoutes, "alice", "POST", "/move", { from: "2026-10-20", to: "2026-10-12" });
    expect(await plan("alice")).toEqual([day("2026-10-12", soba), day("2026-10-15", ramen, "s1")]);
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

  test("unplanning clears the days, and deleting a recipe takes its meals and favorites", async () => {
    await send(mealPlanRoutes, "alice", "POST", "/remove", { dates: ["2026-10-15"] });
    expect(await plan("alice")).toEqual([day("2026-10-12", soba)]);
    expect((await send(recipeRoutes, "alice", "DELETE", `/${soba}`)).status).toBe(200);
    expect(await plan("alice")).toEqual([]);
    const { recipes, favoriteIds } = await collection("alice");
    expect(recipes.map((recipe) => recipe.id)).toEqual([ramen]);
    expect(favoriteIds).toEqual([]);
  });
});

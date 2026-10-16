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
const { tagRoutes } = await import("./routes");
const { recipeRoutes } = await import("../recipes/routes");

type Routes = {
  request: (
    path: string,
    init: RequestInit,
    env: object,
    executionCtx: ExecutionContext,
  ) => Response | Promise<Response>;
};

const executionCtx: ExecutionContext = {
  waitUntil: () => {},
  passThroughOnException: () => {},
  props: {},
};

function send(routes: Routes, user: string, method: string, path: string, json?: unknown) {
  return routes.request(
    path,
    {
      method,
      headers: { cookie: `user=${user}`, "Content-Type": "application/json" },
      ...(json === undefined ? {} : { body: JSON.stringify(json) }),
    },
    {},
    executionCtx,
  );
}

type Collection = {
  recipes: { id: string; tagIds: string[] }[];
  tags: { id: string; name: string }[];
};

async function collection(user: string) {
  const response = await send(recipeRoutes, user, "GET", "/");
  // The response's shape is what these tests check.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return (await response.json()) as Collection;
}

async function tagNames(user: string) {
  const { tags } = await collection(user);
  return tags.map((tag) => tag.name).toSorted();
}

async function tagsOf(user: string, recipeId: string) {
  const { recipes } = await collection(user);
  return recipes.find(({ id }) => id === recipeId)?.tagIds.toSorted() ?? [];
}

const soba = "00000000-0000-4000-8000-000000000001";
const ramen = "00000000-0000-4000-8000-000000000002";
const dessert = "00000000-0000-4000-8000-0000000000a1";
const desserts = "00000000-0000-4000-8000-0000000000a2";
const quick = "00000000-0000-4000-8000-0000000000a3";
const theirs = "00000000-0000-4000-8000-0000000000b1";

function recipe(id: string, tagIds: string[], newTags: { id: string; name: string }[] = []) {
  return { id, title: id, ingredients: [], instructions: [], tagIds, newTags };
}

describe("tag routes", () => {
  test("a member adds a tag for the whole household, named like the others", async () => {
    const response = await send(tagRoutes, "alice", "POST", "/", {
      id: dessert,
      name: " dessert ",
    });
    expect(response.status).toBe(201);
    expect(await tagNames("bob")).toEqual(["Dessert"]);
  });

  test("a name another tag has, in any case or accent, is refused", async () => {
    for (const name of ["DESSERT", "Dessért"]) {
      const response = await send(tagRoutes, "bob", "POST", "/", { id: quick, name });
      expect(response.status).toBe(409);
    }
    expect(await tagNames("alice")).toEqual(["Dessert"]);
  });

  test("renaming changes the tag on every recipe, and can't take another tag's name", async () => {
    await send(
      recipeRoutes,
      "alice",
      "POST",
      "/",
      recipe(soba, [dessert, quick], [{ id: quick, name: "Quick" }]),
    );
    expect((await send(tagRoutes, "bob", "PUT", `/${quick}`, { name: "fast" })).status).toBe(200);
    expect(await tagNames("alice")).toEqual(["Dessert", "Fast"]);
    expect(await tagsOf("alice", soba)).toEqual([dessert, quick]);

    expect((await send(tagRoutes, "bob", "PUT", `/${quick}`, { name: "dessert" })).status).toBe(
      409,
    );
    // Changing only its case is fine.
    expect((await send(tagRoutes, "bob", "PUT", `/${quick}`, { name: "FAST" })).status).toBe(200);
    expect(await tagNames("alice")).toEqual(["Dessert", "FAST"]);
  });

  test("merging moves the tag's recipes to the other tag and deletes it", async () => {
    await send(
      recipeRoutes,
      "alice",
      "POST",
      "/",
      recipe(ramen, [desserts], [{ id: desserts, name: "Desserts" }]),
    );
    await send(recipeRoutes, "alice", "PUT", `/${soba}`, recipe(soba, [dessert, desserts, quick]));

    const response = await send(tagRoutes, "bob", "POST", `/${desserts}/merge`, { into: dessert });
    expect(response.status).toBe(200);
    expect(await tagNames("alice")).toEqual(["Dessert", "FAST"]);
    // A recipe that had both keeps one.
    expect(await tagsOf("alice", soba)).toEqual([dessert, quick]);
    expect(await tagsOf("alice", ramen)).toEqual([dessert]);
  });

  test("merging into itself or a missing tag is refused", async () => {
    expect(
      (await send(tagRoutes, "bob", "POST", `/${dessert}/merge`, { into: dessert })).status,
    ).toBe(404);
    expect(
      (await send(tagRoutes, "bob", "POST", `/${dessert}/merge`, { into: desserts })).status,
    ).toBe(404);
    expect(await tagsOf("alice", ramen)).toEqual([dessert]);
  });

  test("deleting a tag takes it off its recipes, and the recipes stay", async () => {
    expect((await send(tagRoutes, "bob", "DELETE", `/${dessert}`)).status).toBe(200);
    expect(await tagNames("alice")).toEqual(["FAST"]);
    expect(await tagsOf("alice", soba)).toEqual([quick]);
    expect(await tagsOf("alice", ramen)).toEqual([]);
  });

  test("another household's tags are out of reach", async () => {
    await send(tagRoutes, "stranger", "POST", "/", { id: theirs, name: "Theirs" });
    expect((await send(tagRoutes, "alice", "PUT", `/${theirs}`, { name: "Mine" })).status).toBe(
      404,
    );
    expect(
      (await send(tagRoutes, "alice", "POST", `/${quick}/merge`, { into: theirs })).status,
    ).toBe(404);
    expect(
      (await send(tagRoutes, "alice", "POST", `/${theirs}/merge`, { into: quick })).status,
    ).toBe(404);
    expect((await send(tagRoutes, "alice", "DELETE", `/${theirs}`)).status).toBe(404);
    expect(await tagNames("stranger")).toEqual(["Theirs"]);
    // Names only clash within a household.
    expect(
      (await send(tagRoutes, "alice", "POST", "/", { id: dessert, name: "Theirs" })).status,
    ).toBe(201);
  });

  test("an ID that's already saved is refused", async () => {
    const response = await send(tagRoutes, "alice", "POST", "/", { id: theirs, name: "Another" });
    expect(response.status).toBe(409);
  });
});

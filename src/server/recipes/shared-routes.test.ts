import { describe, expect, mock, test } from "bun:test";

import type { ExecutionContext } from "hono";

import { addHousehold, createMemoryDatabase } from "../../../scripts/testing/memory-database";

const { sqlite, db } = createMemoryDatabase();
addHousehold(sqlite, "h1", ["alice", "bob"]);
addHousehold(sqlite, "h2", ["stranger"]);
sqlite.run("INSERT INTO user (id, name, email) VALUES ('loner', 'loner', 'loner@example.com')");

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
const { sharedRecipeRoutes } = await import("./shared-routes");

type Routes = {
  request: (
    path: string,
    init: RequestInit,
    env: object,
    executionCtx: ExecutionContext,
  ) => Response | Promise<Response>;
};

// A bucket in memory, with just the methods the routes reach.
const objects = new Map<string, string>();
const env = {
  PHOTOS: {
    get: async (key: string) => {
      const body = objects.get(key);
      return body === undefined
        ? null
        : { body, httpMetadata: { contentType: "image/jpeg" }, writeHttpMetadata: () => {} };
    },
    put: async (key: string, body: string) => void objects.set(key, body),
    delete: async (keys: string | string[]) => [keys].flat().forEach((key) => objects.delete(key)),
  },
  PUBLIC_RATE_LIMITER: { limit: async () => ({ success: true }) },
};

const executionCtx: ExecutionContext = {
  waitUntil: () => {},
  passThroughOnException: () => {},
  props: {},
};

function send(routes: Routes, user: string | null, method: string, path: string, json?: unknown) {
  return routes.request(
    path,
    {
      method,
      headers: {
        ...(user ? { cookie: `user=${user}` } : {}),
        "Content-Type": "application/json",
      },
      ...(json === undefined ? {} : { body: JSON.stringify(json) }),
    },
    env,
    executionCtx,
  );
}

type SharedRecipe = {
  recipe: Record<string, unknown>;
  household: { name: string; language: string };
  viewer: { ownRecipeId: string | null; savedRecipeId: string | null };
};

async function shared(user: string | null, token: string) {
  const response = await send(sharedRecipeRoutes, user, "GET", `/${token}`);
  // The response's shape is what these tests check.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return { status: response.status, body: (await response.json()) as SharedRecipe };
}

const soba = "00000000-0000-4000-8000-000000000001";
const copy = "00000000-0000-4000-8000-000000000002";
const photo = "00000000-0000-4000-8000-0000000000f1";
const noodles = "00000000-0000-4000-8000-0000000000a1";
const token = "abcdefghijklmnopqrstuv";
const newToken = "ABCDEFGHIJKLMNOPQRSTUV";

objects.set(`households/h1/photos/${photo}`, "photo bytes");
await send(recipeRoutes, "alice", "POST", "/", {
  id: soba,
  title: "Soba",
  description: "Cold",
  servings: 2,
  ingredients: [{ items: ["Soba"] }],
  instructions: [{ items: ["Boil"] }],
  photoId: photo,
  tagIds: [noodles],
  newTags: [{ id: noodles, name: "Noodles" }],
});

describe("shared recipes", () => {
  test("a private recipe can't be viewed by token", async () => {
    expect((await shared(null, token)).status).toBe(404);
    expect((await shared(null, "not a token")).status).toBe(404);
  });

  test("sharing takes a token in the right format, for the household's own recipe", async () => {
    const malformed = await send(recipeRoutes, "alice", "PUT", `/${soba}/share`, { token: "a" });
    expect(malformed.status).toBe(400);
    const stranger = await send(recipeRoutes, "stranger", "PUT", `/${soba}/share`, { token });
    expect(stranger.status).toBe(404);
    const own = await send(recipeRoutes, "bob", "PUT", `/${soba}/share`, { token });
    expect(own.status).toBe(200);
  });

  test("anyone with the link sees the recipe, without IDs, tags, or members", async () => {
    const response = await send(sharedRecipeRoutes, null, "GET", `/${token}`);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const body = (await response.json()) as SharedRecipe;
    expect(body.household).toEqual({ name: "Household h1", language: "en" });
    expect(body.viewer).toEqual({ ownRecipeId: null, savedRecipeId: null });
    expect(Object.keys(body.recipe).toSorted()).toEqual([
      "description",
      "imageUrl",
      "ingredients",
      "instructions",
      "servings",
      "sourceUrl",
      "title",
      "updatedAt",
    ]);
    expect(body.recipe).toMatchObject({
      title: "Soba",
      imageUrl: `/api/public/recipes/${token}/photo`,
    });
    expect(JSON.stringify(body)).not.toContain("alice");
    expect(JSON.stringify(body)).not.toContain(soba);

    const photoResponse = await send(sharedRecipeRoutes, null, "GET", `/${token}/photo`);
    expect(photoResponse.status).toBe(200);
    expect(await photoResponse.text()).toBe("photo bytes");
  });

  test("a member of the household is pointed at the recipe itself", async () => {
    expect((await shared("bob", token)).body.viewer).toEqual({
      ownRecipeId: soba,
      savedRecipeId: null,
    });
    const own = await send(sharedRecipeRoutes, "bob", "POST", `/${token}/save`, { id: copy });
    expect(own.status).toBe(409);
  });

  test("saving copies the recipe and its photo into another household, once", async () => {
    expect(
      (await send(sharedRecipeRoutes, null, "POST", `/${token}/save`, { id: copy })).status,
    ).toBe(401);
    expect(
      (await send(sharedRecipeRoutes, "loner", "POST", `/${token}/save`, { id: copy })).status,
    ).toBe(404);

    const saved = await send(sharedRecipeRoutes, "stranger", "POST", `/${token}/save`, {
      id: copy,
    });
    expect(saved.status).toBe(201);
    expect(await saved.json()).toEqual({ recipeId: copy });
    expect((await shared("stranger", token)).body.viewer).toEqual({
      ownRecipeId: null,
      savedRecipeId: copy,
    });

    const response = await send(recipeRoutes, "stranger", "GET", "/");
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const { recipes, tags } = (await response.json()) as {
      recipes: {
        id: string;
        title: string;
        imageUrl: string;
        tagIds: string[];
        shareToken: null;
      }[];
      tags: unknown[];
    };
    expect(tags).toEqual([]);
    expect(recipes).toMatchObject([
      { id: copy, title: "Soba", tagIds: [], shareToken: null, createdBy: "stranger" },
    ]);
    const copiedPhoto = recipes[0]?.imageUrl.replace("/api/photos/", "");
    expect(copiedPhoto).not.toBe(photo);
    expect(objects.get(`households/h2/photos/${copiedPhoto}`)).toBe("photo bytes");

    const again = await send(sharedRecipeRoutes, "stranger", "POST", `/${token}/save`, {
      id: "00000000-0000-4000-8000-000000000003",
    });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ recipeId: copy });
  });

  test("turning sharing off stops the link at once, and on again brings the same link back", async () => {
    await send(recipeRoutes, "alice", "DELETE", `/${soba}/share`);
    expect((await shared(null, token)).status).toBe(404);
    expect((await send(sharedRecipeRoutes, null, "GET", `/${token}/photo`)).status).toBe(404);

    // A token sent along is only for a recipe's first share.
    await send(recipeRoutes, "alice", "PUT", `/${soba}/share`, { token: newToken });
    expect((await shared(null, token)).status).toBe(200);
    expect((await shared(null, newToken)).status).toBe(404);
  });

  test("resetting the link stops the old one, and keeps the recipe shared", async () => {
    await send(recipeRoutes, "alice", "POST", `/${soba}/share/reset`, { token: newToken });
    expect((await shared(null, token)).status).toBe(404);
    expect((await shared(null, newToken)).status).toBe(200);
    // The household's copy is still found under the new link.
    expect((await shared("stranger", newToken)).body.viewer.savedRecipeId).toBe(copy);
  });

  test("a token another recipe uses is refused", async () => {
    const response = await send(recipeRoutes, "stranger", "PUT", `/${copy}/share`, {
      token: newToken,
    });
    expect(response.status).toBe(409);
  });
});

import { beforeEach, describe, expect, test } from "bun:test";

import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { createStorePromise, queryDb } from "@livestore/livestore";
import type { Store } from "@livestore/livestore";

import { favorites, recipeFavorited, recipeSchema, recipeUnfavorited } from "./recipes";

let store: Store<typeof recipeSchema>;

beforeEach(async () => {
  store = await createStorePromise({
    schema: recipeSchema,
    adapter: makeInMemoryAdapter(),
    storeId: "test",
  });
});

const day = (date: number) => new Date(Date.UTC(2026, 9, date));

function favoriteIds(userId: string) {
  return store.query(queryDb(favorites.where({ userId }))).map(({ recipeId }) => recipeId);
}

describe("favorite events", () => {
  test("favorites belong to the member who added them", () => {
    store.commit(
      recipeFavorited({ recipeId: "r1", userId: "u1", favoritedAt: day(1) }),
      recipeFavorited({ recipeId: "r2", userId: "u2", favoritedAt: day(1) }),
    );
    expect(favoriteIds("u1")).toEqual(["r1"]);
    expect(favoriteIds("u2")).toEqual(["r2"]);
  });

  test("favoriting twice keeps the first, and unfavoriting removes it", () => {
    store.commit(
      recipeFavorited({ recipeId: "r1", userId: "u1", favoritedAt: day(1) }),
      recipeFavorited({ recipeId: "r1", userId: "u1", favoritedAt: day(2) }),
    );
    expect([...store.query(queryDb(favorites.where({ userId: "u1" })))]).toEqual([
      { userId: "u1", recipeId: "r1", favoritedAt: day(1) },
    ]);
    store.commit(recipeUnfavorited({ recipeId: "r1", userId: "u1", unfavoritedAt: day(3) }));
    expect(favoriteIds("u1")).toEqual([]);
  });
});

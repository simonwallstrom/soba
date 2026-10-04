import { beforeEach, describe, expect, test } from "bun:test";

import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { createStorePromise, queryDb } from "@livestore/livestore";
import type { Store } from "@livestore/livestore";

import {
  favorites,
  normalizeTagName,
  recipeCreated,
  recipeDeleted,
  recipeFavorited,
  recipePhotoChanged,
  recipes,
  recipeSchema,
  recipeTags,
  recipeUnfavorited,
  recipeUpdated,
} from "./recipes";

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

describe("recipe events", () => {
  test("an update replaces the recipe's text, details and tags", () => {
    store.commit(
      recipeCreated({
        id: "r1",
        title: "Soba",
        description: "Quick",
        servings: 2,
        imageUrl: "https://example.com/soba.jpg",
        ingredients: [{ items: ["Soba"] }],
        tagIds: ["t1", "t2"],
        createdBy: "u1",
        createdAt: day(1),
      }),
      recipeUpdated({
        id: "r1",
        title: "Cold soba",
        ingredients: [{ heading: "Dip", items: ["Tsuyu"] }],
        instructions: [{ items: ["Boil"] }],
        tagIds: ["t2", "t3"],
        updatedBy: "u2",
        updatedAt: day(2),
      }),
    );
    expect(store.query(queryDb(recipes.where({ id: "r1" }).first()))).toMatchObject({
      title: "Cold soba",
      description: null,
      servings: null,
      imageUrl: "https://example.com/soba.jpg",
      ingredients: [{ heading: "Dip", items: ["Tsuyu"] }],
      instructions: [{ items: ["Boil"] }],
      createdBy: "u1",
      createdAt: day(1),
      updatedBy: "u2",
      updatedAt: day(2),
    });
    expect(
      store.query(queryDb(recipeTags.where({ recipeId: "r1" }))).map(({ tagId }) => tagId),
    ).toEqual(["t2", "t3"]);
  });

  test("a delete hides the recipe but keeps its row", () => {
    store.commit(
      recipeCreated({ id: "r1", title: "Soba", createdBy: "u1", createdAt: day(1) }),
      recipeDeleted({ id: "r1", deletedBy: "u2", deletedAt: day(2) }),
    );
    expect(store.query(queryDb(recipes.where({ deletedAt: null })))).toHaveLength(0);
    expect(store.query(queryDb(recipes.where({ id: "r1" }).first()))).toMatchObject({
      title: "Soba",
      deletedAt: day(2),
    });
  });

  test("a photo change sets, replaces, and removes the photo", () => {
    const imageUrl = () => store.query(queryDb(recipes.where({ id: "r1" }).first()))?.imageUrl;
    store.commit(
      recipeCreated({ id: "r1", title: "Soba", createdBy: "u1", createdAt: day(1) }),
      recipePhotoChanged({ id: "r1", photoId: "p1", updatedBy: "u1", updatedAt: day(1) }),
    );
    expect(imageUrl()).toBe("/api/photos/p1");
    store.commit(
      recipePhotoChanged({ id: "r1", photoId: "p2", updatedBy: "u2", updatedAt: day(2) }),
    );
    expect(imageUrl()).toBe("/api/photos/p2");
    store.commit(recipePhotoChanged({ id: "r1", updatedBy: "u2", updatedAt: day(3) }));
    expect(imageUrl()).toBeNull();
  });
});

describe("normalizeTagName", () => {
  test("capitalizes the first letter and keeps the rest as typed", () => {
    expect(normalizeTagName("  vegetariskt ")).toBe("Vegetariskt");
    expect(normalizeTagName("ört  och   kryddor")).toBe("Ört och kryddor");
    expect(normalizeTagName("BBQ")).toBe("BBQ");
    expect(normalizeTagName("5 min")).toBe("5 min");
  });
});

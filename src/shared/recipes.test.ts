import { beforeEach, describe, expect, test } from "bun:test";

import { makeInMemoryAdapter } from "@livestore/adapter-web";
import { createStorePromise, queryDb } from "@livestore/livestore";
import type { Store } from "@livestore/livestore";

import {
  collectionCreated,
  collectionDeleted,
  collectionRecipes,
  collections,
  collectionUpdated,
  recipeAddedToCollection,
  recipeRemovedFromCollection,
  recipeSchema,
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

function collection() {
  return store.query(queryDb(collections.where({ id: "c1" }).first()));
}

function recipeIds() {
  return store
    .query(queryDb(collectionRecipes.where({ collectionId: "c1" })))
    .map((row) => row.recipeId);
}

function create() {
  store.commit(
    collectionCreated({ id: "c1", title: "Quick dinners", createdBy: "u1", createdAt: day(1) }),
  );
}

describe("collection events", () => {
  test("create a collection without a description", () => {
    create();
    expect(collection()).toMatchObject({
      title: "Quick dinners",
      description: null,
      updatedBy: "u1",
      updatedAt: day(1),
      deletedAt: null,
    });
  });

  test("an update changes only the fields it carries", () => {
    create();
    store.commit(
      collectionUpdated({
        id: "c1",
        description: "Weeknights",
        updatedBy: "u2",
        updatedAt: day(2),
      }),
    );
    expect(collection()).toMatchObject({ title: "Quick dinners", description: "Weeknights" });

    store.commit(
      collectionUpdated({ id: "c1", description: null, updatedBy: "u2", updatedAt: day(3) }),
    );
    expect(collection()).toMatchObject({
      title: "Quick dinners",
      description: null,
      updatedAt: day(3),
    });
  });

  test("adding a recipe twice keeps the first add", () => {
    create();
    store.commit(
      recipeAddedToCollection({
        collectionId: "c1",
        recipeId: "r1",
        addedBy: "u1",
        addedAt: day(2),
      }),
      recipeAddedToCollection({
        collectionId: "c1",
        recipeId: "r1",
        addedBy: "u2",
        addedAt: day(3),
      }),
    );
    const rows = store.query(queryDb(collectionRecipes.where({ collectionId: "c1" })));
    expect(rows).toEqual([{ collectionId: "c1", recipeId: "r1", addedBy: "u1", addedAt: day(2) }]);
    expect(collection()).toMatchObject({ updatedBy: "u2", updatedAt: day(3) });
  });

  test("removing a recipe leaves the others", () => {
    create();
    store.commit(
      recipeAddedToCollection({
        collectionId: "c1",
        recipeId: "r1",
        addedBy: "u1",
        addedAt: day(2),
      }),
      recipeAddedToCollection({
        collectionId: "c1",
        recipeId: "r2",
        addedBy: "u1",
        addedAt: day(2),
      }),
      recipeRemovedFromCollection({
        collectionId: "c1",
        recipeId: "r1",
        removedBy: "u2",
        removedAt: day(3),
      }),
    );
    expect(recipeIds()).toEqual(["r2"]);
    expect(collection()).toMatchObject({ updatedBy: "u2", updatedAt: day(3) });
  });

  test("deleting a collection hides it and keeps its recipes", () => {
    create();
    store.commit(
      recipeAddedToCollection({
        collectionId: "c1",
        recipeId: "r1",
        addedBy: "u1",
        addedAt: day(2),
      }),
      collectionDeleted({ id: "c1", deletedBy: "u2", deletedAt: day(3) }),
    );
    expect(collection()?.deletedAt).toEqual(day(3));
    expect(recipeIds()).toEqual(["r1"]);
  });
});

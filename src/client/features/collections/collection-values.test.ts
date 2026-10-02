import { describe, expect, test } from "bun:test";

import { changedCollectionValues, normalizeCollectionValues } from "./collection-values";

describe("normalizeCollectionValues", () => {
  test("trims text and stores a blank description as none", () => {
    expect(normalizeCollectionValues({ title: " Fika ", description: "  " })).toEqual({
      title: "Fika",
      description: null,
    });
  });
});

describe("changedCollectionValues", () => {
  const collection = { title: "Fika", description: "Buns and cakes" };

  test("keeps only changed fields", () => {
    expect(changedCollectionValues(collection, { title: "Fika ", description: "Buns" })).toEqual({
      description: "Buns",
    });
  });

  test("clears the description", () => {
    expect(changedCollectionValues(collection, { title: "Fika", description: "" })).toEqual({
      description: null,
    });
  });

  test("is null when nothing changed", () => {
    expect(changedCollectionValues(collection, { ...collection })).toBeNull();
  });
});

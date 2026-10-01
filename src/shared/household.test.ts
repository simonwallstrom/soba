import { describe, expect, test } from "bun:test";

import { householdStoreId, parseHouseholdStoreId } from "./household";

describe("household store IDs", () => {
  test("round-trip through the sync store ID", () => {
    expect(parseHouseholdStoreId(householdStoreId("abc"))).toBe("abc");
  });

  test("reject store IDs from other namespaces", () => {
    expect(parseHouseholdStoreId("family-abc")).toBeNull();
  });

  test("reject store IDs from an earlier sync history", () => {
    expect(parseHouseholdStoreId("household-abc")).toBeNull();
  });
});

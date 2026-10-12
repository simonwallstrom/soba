import { describe, expect, test } from "bun:test";

import { normalizeTagName } from "./recipes";

describe("normalizeTagName", () => {
  test("capitalizes the first letter and keeps the rest as typed", () => {
    expect(normalizeTagName("  vegetariskt ")).toBe("Vegetariskt");
    expect(normalizeTagName("ört  och   kryddor")).toBe("Ört och kryddor");
    expect(normalizeTagName("BBQ")).toBe("BBQ");
    expect(normalizeTagName("5 min")).toBe("5 min");
  });
});

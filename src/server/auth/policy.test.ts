import { describe, expect, test } from "bun:test";

import { isAllowlisted } from "./policy";

describe("sign-up allowlist", () => {
  test("matches emails case-insensitively and ignores spacing", () => {
    expect(isAllowlisted(" You@Example.com ", "other@example.com, you@example.com")).toBe(true);
  });

  test("rejects emails that are not listed", () => {
    expect(isAllowlisted("stranger@example.com", "you@example.com")).toBe(false);
    expect(isAllowlisted("you@example.com", "")).toBe(false);
  });
});

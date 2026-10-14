import { describe, expect, test } from "bun:test";

import { cleanUserUpdate, isAllowlisted, signUpName } from "./policy";

describe("sign-up allowlist", () => {
  test("matches emails case-insensitively and ignores spacing", () => {
    expect(isAllowlisted(" You@Example.com ", "other@example.com, you@example.com")).toBe(true);
  });

  test("rejects emails that are not listed", () => {
    expect(isAllowlisted("stranger@example.com", "you@example.com")).toBe(false);
    expect(isAllowlisted("you@example.com", "")).toBe(false);
  });
});

describe("user names", () => {
  test("a new account takes Google's name, or the start of its email", () => {
    expect(signUpName(" Anna Svensson ", "anna@example.com")).toBe("Anna Svensson");
    expect(signUpName("", "Anna.S@Example.com")).toBe("anna.s");
    expect(signUpName(null, "anna@example.com")).toBe("anna");
  });

  test("a rename is trimmed and must not be blank or too long", () => {
    expect(cleanUserUpdate({ name: "  Mamma " })).toEqual({ ok: true, data: { name: "Mamma" } });
    expect(cleanUserUpdate({ name: "   " })).toEqual({ ok: false, error: "Enter your name" });
    expect(cleanUserUpdate({ name: "x".repeat(81) }).ok).toBe(false);
  });

  test("the photo can't be changed, and other updates pass through", () => {
    expect(cleanUserUpdate({ image: "https://evil.example/x.png", name: "Anna" })).toEqual({
      ok: true,
      data: { name: "Anna" },
    });
    expect(cleanUserUpdate({ emailVerified: true })).toEqual({
      ok: true,
      data: { emailVerified: true },
    });
  });
});

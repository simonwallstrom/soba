import { describe, expect, test } from "bun:test";

import { importHost } from "./recipe-imports";

describe("importHost", () => {
  test("names the site without www", () => {
    expect(importHost("https://www.ica.se/recept/x/")).toBe("ica.se");
    expect(importHost(null)).toBeNull();
  });
});

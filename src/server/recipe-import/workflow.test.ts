import { describe, expect, mock, test } from "bun:test";

// The Workflow base class and env only exist in the Workers runtime.
await mock.module("cloudflare:workers", () => ({
  env: {},
  WorkflowEntrypoint: class {
    run() {
      return Promise.resolve();
    }
  },
}));
const { shortenPageTitle } = await import("./workflow");

describe("shortenPageTitle", () => {
  test("drops the site name", () => {
    expect(shortenPageTitle("Best pancakes | Site")).toBe("Best pancakes");
    expect(shortenPageTitle("Pannkakor – grundsmet – Recept")).toBe("Pannkakor");
    expect(shortenPageTitle("Chicken chasseur")).toBe("Chicken chasseur");
  });
});

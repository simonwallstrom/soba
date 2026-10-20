import { describe, expect, test } from "bun:test";

import { describeActivity, describeDevice } from "./describe-device";

describe("describeDevice", () => {
  test.each([
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
      "Chrome on macOS",
      "computer",
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
      "Safari on iPhone",
      "phone",
    ],
    [
      "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
      "Safari on iPad",
      "tablet",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
      "Edge on Windows",
      "computer",
    ],
    [
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
      "Chrome on Android",
      "phone",
    ],
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 15.6; rv:143.0) Gecko/20100101 Firefox/143.0",
      "Firefox on macOS",
      "computer",
    ],
    ["", "Unknown device", "computer"],
  ] as const)("%s", (userAgent, name, kind) => {
    expect(describeDevice(userAgent)).toEqual({ name, kind });
  });
});

describe("describeActivity", () => {
  const now = new Date(2026, 9, 20, 9);

  test("counts calendar days", () => {
    expect(describeActivity(new Date(2026, 9, 20, 1).toISOString(), now)).toBe("Active today");
    expect(describeActivity(new Date(2026, 9, 19, 23).toISOString(), now)).toBe("Active yesterday");
    expect(describeActivity(new Date(2026, 9, 17, 12).toISOString(), now)).toBe(
      "Active 3 days ago",
    );
  });

  test("shows a date after a month", () => {
    expect(describeActivity(new Date(2026, 8, 9).toISOString(), now)).toMatch(/^Last active /);
  });
});

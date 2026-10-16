import { describe, expect, test } from "bun:test";

import { isTimeZone, todayIn } from "./household";

describe("todayIn", () => {
  // 23:30 UTC on October 16 is already the 17th in Stockholm, and still the 16th in New York.
  const lateEvening = new Date(Date.UTC(2026, 9, 16, 23, 30));

  test("gives the date in the household's time zone", () => {
    expect(todayIn("UTC", lateEvening)).toBe("2026-10-16");
    expect(todayIn("Europe/Stockholm", lateEvening)).toBe("2026-10-17");
    expect(todayIn("America/New_York", lateEvening)).toBe("2026-10-16");
  });
});

describe("isTimeZone", () => {
  test("accepts IANA names and refuses anything else", () => {
    expect(isTimeZone("Europe/Stockholm")).toBe(true);
    expect(isTimeZone("UTC")).toBe(true);
    expect(isTimeZone("Europe/Atlantis")).toBe(false);
    expect(isTimeZone("")).toBe(false);
  });
});

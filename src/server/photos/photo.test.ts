import { describe, expect, test } from "bun:test";

import { detectPhotoType, isPhotoId, photoKey } from "./photo";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(
    values.flatMap((value) =>
      typeof value === "string" ? [...new TextEncoder().encode(value)] : [value],
    ),
  );

describe("detectPhotoType", () => {
  test("recognizes JPEG, PNG and WebP by their bytes", () => {
    expect(detectPhotoType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectPhotoType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(detectPhotoType(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "))).toBe("image/webp");
  });

  test("rejects anything else", () => {
    expect(detectPhotoType(bytes("<svg>"))).toBeNull();
    expect(detectPhotoType(bytes("GIF89a"))).toBeNull();
    expect(detectPhotoType(bytes())).toBeNull();
  });
});

describe("photo IDs and keys", () => {
  test("accepts only UUIDs, so a key cannot leave its household", () => {
    expect(isPhotoId("0f8fad5b-d9cb-469f-a165-70867728950e")).toBe(true);
    expect(isPhotoId("../other/photos/x")).toBe(false);
    expect(photoKey("h1", "p1")).toBe("households/h1/photos/p1");
  });
});

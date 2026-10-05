import { describe, expect, mock, test } from "bun:test";

// Members of household h1 sign in with the cookie "user=<id>".
await mock.module(new URL("../auth/auth.ts", import.meta.url).pathname, () => ({
  getSession: async (headers: Headers) => {
    const id = headers.get("cookie")?.match(/user=(\w+)/u)?.[1];
    return id ? { user: { id } } : null;
  },
}));
await mock.module(new URL("../household/household.ts", import.meta.url).pathname, () => ({
  getMembership: async (userId: string) =>
    userId === "stranger"
      ? { id: "h2", name: "Other", role: "owner", language: "en", units: "metric" }
      : { id: "h1", name: "Home", role: "member", language: "en", units: "metric" },
}));
const { photoRoutes } = await import("./routes");

// Just the R2 methods the routes use.
function memoryBucket() {
  const objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
  return {
    objects,
    put: async (
      key: string,
      bytes: Uint8Array,
      options: { httpMetadata: { contentType: string } },
    ) => {
      objects.set(key, { bytes, contentType: options.httpMetadata.contentType });
    },
    get: async (key: string, { onlyIf }: { onlyIf: Headers }) => {
      const object = objects.get(key);
      if (!object) return null;
      const metadata = {
        httpEtag: `"${key}"`,
        writeHttpMetadata: (headers: Headers) => headers.set("Content-Type", object.contentType),
      };
      return onlyIf.get("if-none-match") === metadata.httpEtag
        ? metadata
        : { ...metadata, body: object.bytes };
    },
  };
}

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

function request(bucket: ReturnType<typeof memoryBucket>, path: string, init: RequestInit = {}) {
  return photoRoutes.request(path, init, { PHOTOS: bucket });
}

async function photoIdOf(response: Response) {
  const body: unknown = await response.json();
  if (typeof body === "object" && body !== null && "photoId" in body) {
    if (typeof body.photoId === "string") return body.photoId;
  }
  throw new Error("No photo ID in the response");
}

async function upload(
  bucket: ReturnType<typeof memoryBucket>,
  body: Uint8Array<ArrayBuffer>,
  user = "alice",
) {
  return request(bucket, "/", { method: "POST", body, headers: { cookie: `user=${user}` } });
}

describe("photo routes", () => {
  test("stores an upload under the household and serves it back to members", async () => {
    const bucket = memoryBucket();
    const response = await upload(bucket, png);
    expect(response.status).toBe(201);
    const photoId = await photoIdOf(response);
    expect([...bucket.objects.keys()]).toEqual([`households/h1/photos/${photoId}`]);

    const photo = await request(bucket, `/${photoId}`, { headers: { cookie: "user=bob" } });
    expect(photo.status).toBe(200);
    expect(photo.headers.get("Content-Type")).toBe("image/png");
    expect(photo.headers.get("Cache-Control")).toContain("immutable");
    expect(new Uint8Array(await photo.arrayBuffer())).toEqual(png);

    const cached = await request(bucket, `/${photoId}`, {
      headers: { cookie: "user=bob", "If-None-Match": photo.headers.get("ETag") ?? "" },
    });
    expect(cached.status).toBe(304);
  });

  test("hides photos from other households and from signed-out visitors", async () => {
    const bucket = memoryBucket();
    const photoId = await photoIdOf(await upload(bucket, png));
    expect(
      (await request(bucket, `/${photoId}`, { headers: { cookie: "user=stranger" } })).status,
    ).toBe(404);
    expect((await request(bucket, `/${photoId}`)).status).toBe(401);
  });

  test("rejects files that are not photos, whatever their type claims", async () => {
    const bucket = memoryBucket();
    const svg = new TextEncoder().encode("<svg onload=alert(1)>");
    const response = await request(bucket, "/", {
      method: "POST",
      body: svg,
      headers: { cookie: "user=alice", "Content-Type": "image/png" },
    });
    expect(response.status).toBe(415);
    expect(bucket.objects.size).toBe(0);
  });
});

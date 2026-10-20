import { describe, expect, mock, test } from "bun:test";

import type { ExecutionContext } from "hono";

import { addHousehold, createMemoryDatabase } from "../../../scripts/testing/memory-database";

const { sqlite, db } = createMemoryDatabase();
addHousehold(sqlite, "h1", ["alice", "bob"]);

const day = 86_400_000;
const now = Date.now();
// Alice is logged in on three devices, one of them expired; Bob on one.
for (const [id, userId, updatedAt, expiresAt] of [
  ["laptop", "alice", now, now + 30 * day],
  ["phone", "alice", now - 3 * day, now + 27 * day],
  ["old", "alice", now - 40 * day, now - 10 * day],
  ["bobs", "bob", now, now + 30 * day],
] as const) {
  sqlite.run(
    "INSERT INTO session (id, token, user_id, updated_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)",
    [id, `token-${id}`, userId, updatedAt, expiresAt, "Mozilla/5.0"],
  );
}

// Members sign in with the cookie "user=<id>; session=<id>".
await mock.module(new URL("./auth.ts", import.meta.url).pathname, () => ({
  getSession: async (headers: Headers) => {
    const cookie = headers.get("cookie") ?? "";
    const id = cookie.match(/user=(\w+)/u)?.[1];
    const sessionId = cookie.match(/session=(\w+)/u)?.[1];
    return id && sessionId ? { user: { id }, sessionId } : null;
  },
}));
await mock.module(new URL("../db/client.ts", import.meta.url).pathname, () => ({
  getDatabase: () => db,
}));
const { deviceRoutes } = await import("./device-routes");

const executionCtx: ExecutionContext = {
  waitUntil: () => {},
  passThroughOnException: () => {},
  props: {},
};

function send(user: string, sessionId: string, method: string, path: string) {
  return deviceRoutes.request(
    path,
    { method, headers: { cookie: `user=${user}; session=${sessionId}` } },
    {},
    executionCtx,
  );
}

async function deviceIds(user: string, sessionId: string) {
  const response = await send(user, sessionId, "GET", "/");
  // The response's shape is what these tests check.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const { devices } = (await response.json()) as { devices: { id: string; current: boolean }[] };
  return devices;
}

describe("device routes", () => {
  test("lists the member's own active sessions, newest first, without tokens", async () => {
    const response = await send("alice", "laptop", "GET", "/");
    expect(await response.text()).not.toContain("token-");
    expect(await deviceIds("alice", "laptop")).toEqual([
      expect.objectContaining({ id: "laptop", current: true }),
      expect.objectContaining({ id: "phone", current: false }),
    ]);
  });

  test("won't log out another member's session or this one", async () => {
    expect((await send("alice", "laptop", "DELETE", "/bobs")).status).toBe(404);
    expect((await send("alice", "laptop", "DELETE", "/laptop")).status).toBe(400);
    expect(await deviceIds("bob", "bobs")).toHaveLength(1);
  });

  test("logs out one device", async () => {
    expect((await send("alice", "laptop", "DELETE", "/phone")).status).toBe(200);
    expect((await deviceIds("alice", "laptop")).map((device) => device.id)).toEqual(["laptop"]);
  });

  test("logs out every other device, and only the member's", async () => {
    sqlite.run(
      "INSERT INTO session (id, token, user_id, updated_at, expires_at) VALUES ('tablet', 'token-tablet', 'alice', ?, ?)",
      [now, now + 30 * day],
    );
    expect((await send("alice", "laptop", "DELETE", "/others")).status).toBe(200);
    expect((await deviceIds("alice", "laptop")).map((device) => device.id)).toEqual(["laptop"]);
    expect(await deviceIds("bob", "bobs")).toHaveLength(1);
  });
});

import { expect, mock, test } from "bun:test";

import { addHousehold, createMemoryDatabase } from "../../../scripts/testing/memory-database";

const { sqlite, db } = createMemoryDatabase();
addHousehold(sqlite, "h1", ["alice", "bob"]);
sqlite.run(
  "INSERT INTO recipe (id, household_id, title, ingredients, instructions, created_by, updated_by) VALUES ('r1', 'h1', 'Soup', '[]', '[]', 'bob', 'bob')",
);

// Members sign in with the cookie "user=<id>", as <id>@example.com.
await mock.module(new URL("../auth/auth.ts", import.meta.url).pathname, () => ({
  getSession: async (headers: Headers) => {
    const id = headers.get("cookie")?.match(/user=(\w+)/u)?.[1];
    return id ? { user: { id, email: `${id}@example.com` }, sessionId: `s-${id}` } : null;
  },
}));
await mock.module(new URL("../db/client.ts", import.meta.url).pathname, () => ({
  getDatabase: () => db,
}));
const { adminRoutes } = await import("./routes");
const { isAllowlisted } = await import("./beta");

const env = { ADMIN_EMAILS: "Alice@example.com" };

function send(user: string | null, method: string, path: string, body?: unknown) {
  return adminRoutes.request(
    path,
    {
      method,
      headers: {
        ...(user && { cookie: `user=${user}` }),
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    },
    env,
  );
}

async function betaEmails() {
  // The response's shape is what these tests check.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const body = (await (await send("alice", "GET", "/beta")).json()) as {
    access: { email: string; admin: boolean; signedUpAt: string | null }[];
  };
  return body.access;
}

test("anyone but an admin gets a 404, logged in or not", async () => {
  expect((await send(null, "GET", "/users")).status).toBe(404);
  expect((await send("bob", "GET", "/users")).status).toBe(404);
  expect((await send("bob", "POST", "/beta", { email: "eve@example.com" })).status).toBe(404);
  expect((await send("alice", "GET", "/users")).status).toBe(200);
});

test("lists every user with their household and progress", async () => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const { users } = (await (await send("alice", "GET", "/users")).json()) as {
    users: {
      id: string;
      recipes: number;
      household: { role: string; members: number; recipes: number; checklist: object } | null;
    }[];
  };
  const bob = users.find(({ id }) => id === "bob");
  expect(bob?.recipes).toBe(1);
  expect(bob?.household).toMatchObject({
    role: "member",
    members: 2,
    recipes: 1,
    checklist: { done: 1, total: 3 },
  });
  const alice = users.find(({ id }) => id === "alice");
  // Created the household, and Bob joined.
  expect(alice?.household?.checklist).toEqual({ done: 2, total: 5 });
  expect(alice?.recipes).toBe(0);
});

test("admins are let in without being on the list", async () => {
  expect(await isAllowlisted("alice@example.com", env.ADMIN_EMAILS)).toBe(true);
  expect(await isAllowlisted("eve@example.com", env.ADMIN_EMAILS)).toBe(false);
  const [admin, ...rest] = await betaEmails();
  expect(admin).toMatchObject({ email: "alice@example.com", admin: true });
  expect(admin?.signedUpAt).not.toBeNull();
  expect(rest).toEqual([]);
});

test("an admin adds and removes emails, normalized", async () => {
  expect((await send("alice", "POST", "/beta", { email: " Eve@Example.com " })).status).toBe(200);
  expect(await isAllowlisted("eve@example.com", env.ADMIN_EMAILS)).toBe(true);
  expect((await betaEmails()).map(({ email }) => email)).toEqual([
    "alice@example.com",
    "eve@example.com",
  ]);

  expect((await send("alice", "DELETE", "/beta/eve@example.com")).status).toBe(200);
  expect(await isAllowlisted("eve@example.com", env.ADMIN_EMAILS)).toBe(false);
  expect((await send("alice", "DELETE", "/beta/eve@example.com")).status).toBe(404);
});

test("rejects what isn't an email", async () => {
  expect((await send("alice", "POST", "/beta", { email: "eve" })).status).toBe(400);
});

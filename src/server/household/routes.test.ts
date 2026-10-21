import { expect, mock, test } from "bun:test";

import { addHousehold, createMemoryDatabase } from "../../../scripts/testing/memory-database";

const { sqlite, db } = createMemoryDatabase();
addHousehold(sqlite, "h1", ["alice", "bob"]);

// Members sign in with the cookie "user=<id>".
await mock.module(new URL("../auth/auth.ts", import.meta.url).pathname, () => ({
  getSession: async (headers: Headers) => {
    const id = headers.get("cookie")?.match(/user=(\w+)/u)?.[1];
    return id ? { user: { id } } : null;
  },
}));
await mock.module(new URL("../db/client.ts", import.meta.url).pathname, () => ({
  getDatabase: () => db,
}));
const { householdRoutes, inviteRoutes } = await import("./routes");

function rename(user: string, name: string) {
  return householdRoutes.request(
    "/name",
    {
      method: "PUT",
      headers: { cookie: `user=${user}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    },
    {},
  );
}

function send(user: string, method: string, path: string) {
  return householdRoutes.request(path, { method, headers: { cookie: `user=${user}` } }, {});
}

async function readInviteUrl(response: Response) {
  const body: unknown = await response.json();
  return typeof body === "object" &&
    body !== null &&
    "inviteUrl" in body &&
    typeof body.inviteUrl === "string"
    ? body.inviteUrl
    : null;
}

async function inviteUrl(user: string) {
  return readInviteUrl(await send(user, "GET", "/"));
}

function householdName() {
  return sqlite.query<{ name: string }, []>("SELECT name FROM household WHERE id = 'h1'").get()
    ?.name;
}

test("the owner renames the household, trimmed", async () => {
  expect((await rename("alice", "  The Smiths ")).status).toBe(200);
  expect(householdName()).toBe("The Smiths");
});

test("members can't rename the household", async () => {
  expect((await rename("bob", "Bob's place")).status).toBe(403);
  expect(householdName()).toBe("The Smiths");
});

test("a blank name is rejected", async () => {
  expect((await rename("alice", "   ")).status).toBe(400);
  expect(householdName()).toBe("The Smiths");
});

test("the owner switches the invite link off and back on, as the same link", async () => {
  const first = await readInviteUrl(await send("alice", "PUT", "/invite"));
  expect(first).not.toBeNull();
  expect(await inviteUrl("alice")).toBe(first);

  expect((await send("alice", "DELETE", "/invite")).status).toBe(200);
  expect(await inviteUrl("alice")).toBeNull();

  expect(await readInviteUrl(await send("alice", "PUT", "/invite"))).toBe(first);
  expect(await inviteUrl("alice")).toBe(first);
});

test("a switched-off invite link stops working until it's switched on again", async () => {
  const url = (await inviteUrl("alice")) ?? "";
  const token = new URL(url).pathname.split("/").pop() ?? "";
  const invitePage = async () => (await inviteRoutes.request(`/${token}`, {}, {})).status;
  expect(await invitePage()).toBe(200);
  await send("alice", "DELETE", "/invite");
  expect(await invitePage()).toBe(404);
  await send("alice", "PUT", "/invite");
  expect(await invitePage()).toBe(200);
});

test("resetting the invite link makes a new one, and switches it on", async () => {
  const first = await inviteUrl("alice");
  await send("alice", "DELETE", "/invite");
  const reset = await readInviteUrl(await send("alice", "POST", "/invite/reset"));
  expect(reset).not.toBeNull();
  expect(reset).not.toBe(first);
  expect(await inviteUrl("alice")).toBe(reset);
});

test("members can't switch or reset the invite link", async () => {
  expect((await send("bob", "DELETE", "/invite")).status).toBe(403);
  expect((await send("bob", "PUT", "/invite")).status).toBe(403);
  expect((await send("bob", "POST", "/invite/reset")).status).toBe(403);
});

test("members hide their own checklist, for good", async () => {
  const { getMembership } = await import("./household");
  expect((await getMembership("bob"))?.checklistHidden).toBe(false);

  expect((await send("bob", "POST", "/checklist/hide")).status).toBe(200);
  expect((await getMembership("bob"))?.checklistHidden).toBe(true);
  expect((await getMembership("alice"))?.checklistHidden).toBe(false);
});

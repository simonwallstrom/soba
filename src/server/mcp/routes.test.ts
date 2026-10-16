import { expect, mock, test } from "bun:test";

import * as v from "valibot";

import { addHousehold, createMemoryDatabase } from "../../../scripts/testing/memory-database";

const { sqlite, db } = createMemoryDatabase();
addHousehold(sqlite, "h1", ["alice", "bob"]);
addHousehold(sqlite, "h2", ["stranger"]);
sqlite.run("INSERT INTO user (id, name, email) VALUES ('carol', 'carol', 'carol@example.com')");

const curry = "11111111-1111-4111-8111-111111111111";
const pancakes = "22222222-2222-4222-8222-222222222222";
const theirs = "33333333-3333-4333-8333-333333333333";
const sections = (items: string[]) => JSON.stringify([{ items }]);
for (const [id, household, title, ingredients] of [
  [curry, "h1", "Chicken curry", ["500 g kycklingfilé", "2 dl crème fraîche"]],
  [pancakes, "h1", "Pancakes", ["3 eggs", "6 dl milk"]],
  [theirs, "h2", "Chicken soup", ["1 chicken"]],
] as const) {
  sqlite.run(
    "INSERT INTO recipe (id, household_id, title, ingredients, instructions, created_by, updated_by) VALUES (?, ?, ?, ?, ?, 'alice', 'alice')",
    [id, household, title, sections([...ingredients]), sections(["Cook it."])],
  );
}
sqlite.run("INSERT INTO tag (id, household_id, name) VALUES ('t1', 'h1', 'Quick')");
sqlite.run(`INSERT INTO recipe_tag (recipe_id, tag_id) VALUES ('${curry}', 't1')`);
// The tools take today's date as the UTC date, so these days are years either side of it.
for (const [date, recipe, by] of [
  ["2020-10-09", curry, "bob"],
  ["2020-10-12", pancakes, "alice"],
  ["2099-12-01", curry, "alice"],
] as const) {
  sqlite.run(
    "INSERT INTO planned_meal (household_id, date, recipe_id, planned_by, planned_at) VALUES ('h1', ?, ?, ?, 0)",
    [date, recipe, by],
  );
}

const issuer = "https://soba.test/api/auth";
const resource = "https://soba.test/mcp";

// Signs access tokens the way Better Auth's JWT plugin does, with an Ed25519 key.
const keys = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
const publicJwk = { ...(await crypto.subtle.exportKey("jwk", keys.publicKey)), kid: "k1" };

await mock.module(new URL("../auth/auth.ts", import.meta.url).pathname, () => ({
  getSession: async () => null,
  mcpResource: () => resource,
  getAuth: () => ({
    api: { getJwks: async () => ({ keys: [{ ...publicJwk, alg: "EdDSA" }] }) },
    $context: Promise.resolve({ baseURL: issuer }),
  }),
}));
await mock.module(new URL("../db/client.ts", import.meta.url).pathname, () => ({
  getDatabase: () => db,
}));
const { mcpRoutes } = await import("./routes");

const limiter = { allow: true };
const env = {
  BETTER_AUTH_URL: "https://soba.test",
  MCP_RATE_LIMITER: { limit: async () => ({ success: limiter.allow }) },
};

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function sign(claims: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  const body = `${encode({ alg: "EdDSA", kid: "k1", typ: "JWT" })}.${encode({
    iss: issuer,
    aud: resource,
    iat: now,
    exp: now + 3600,
    ...claims,
  })}`;
  const signature = await crypto.subtle.sign(
    "Ed25519",
    keys.privateKey,
    new TextEncoder().encode(body),
  );
  return `${body}.${Buffer.from(signature).toString("base64url")}`;
}

async function post(token: string | undefined, method: string, params: object = {}) {
  return mcpRoutes.request(
    "/",
    {
      method: "POST",
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    },
    env,
  );
}

const rpcSchema = v.object({
  result: v.optional(v.record(v.string(), v.unknown())),
  error: v.optional(v.object({ message: v.string() })),
});
const toolResultSchema = v.object({
  content: v.tuple([v.object({ text: v.string() })]),
  isError: v.optional(v.boolean()),
});
const toolsSchema = v.object({
  tools: v.array(
    v.object({ name: v.string(), annotations: v.object({ readOnlyHint: v.boolean() }) }),
  ),
});
const searchSchema = v.object({
  total: v.number(),
  recipes: v.array(v.looseObject({ title: v.string() })),
});

// Answers come as one server-sent event.
async function rpc(user: string, method: string, params: object = {}) {
  const response = await post(await sign({ sub: user }), method, params);
  const text = await response.text();
  return v.parse(rpcSchema, JSON.parse(text.match(/^data: (.*)$/mu)?.[1] ?? text));
}

async function callTool(user: string, name: string, args: object = {}) {
  const { result } = await rpc(user, "tools/call", { name, arguments: args });
  const { content, isError = false } = v.parse(toolResultSchema, result);
  return { isError, text: content[0].text };
}

async function toolJson(user: string, name: string, args: object = {}): Promise<unknown> {
  const { isError, text } = await callTool(user, name, args);
  expect(isError).toBe(false);
  return JSON.parse(text);
}

async function search(args: object) {
  return v.parse(searchSchema, await toolJson("alice", "search_recipes", args));
}

test("without a token, the challenge points to the resource metadata", async () => {
  const response = await post(undefined, "tools/list");
  expect(response.status).toBe(401);
  expect(response.headers.get("WWW-Authenticate")).toContain(
    'resource_metadata="https://soba.test/.well-known/oauth-protected-resource/mcp"',
  );
});

test("tokens for another resource, expired, or bound to a DPoP key are refused", async () => {
  const now = Math.floor(Date.now() / 1000);
  for (const claims of [
    { sub: "alice", aud: "https://soba.test/api" },
    { sub: "alice", iat: now - 7200, exp: now - 3600 },
    { sub: "alice", cnf: { jkt: "thumbprint" } },
    { sub: "alice", iss: "https://elsewhere.test" },
  ]) {
    expect((await post(await sign(claims), "tools/list")).status).toBe(401);
  }
  expect((await post("not-a-jwt", "tools/list")).status).toBe(401);
});

test("a member without a household is told to join one", async () => {
  expect((await post(await sign({ sub: "carol" }), "tools/list")).status).toBe(403);
});

test("a member over the rate limit is asked to wait", async () => {
  limiter.allow = false;
  expect((await post(await sign({ sub: "alice" }), "tools/list")).status).toBe(429);
  limiter.allow = true;
});

test("the server introduces the member's household and lists the read-only tools", async () => {
  const { result } = await rpc("alice", "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "1" },
  });
  expect(result?.["instructions"]).toContain('"Household h1"');
  const { tools } = v.parse(toolsSchema, (await rpc("alice", "tools/list")).result);
  expect(tools.map((tool) => tool.name)).toEqual([
    "get_household",
    "search_recipes",
    "get_recipe",
    "get_meal_plan",
  ]);
  expect(tools.every((tool) => tool.annotations.readOnlyHint)).toBe(true);
});

test("the household has its members and tags", async () => {
  expect(await toolJson("bob", "get_household")).toMatchObject({
    members: [
      { name: "alice", role: "owner", isYou: false },
      { name: "bob", role: "member", isYou: true },
    ],
    recipeCount: 2,
    tags: ["Quick"],
  });
});

test("search finds the household's own recipes by ingredient, without accents, or tag", async () => {
  const byIngredient = await search({ query: "creme fraiche" });
  expect(byIngredient.recipes.map((recipe) => recipe.title)).toEqual(["Chicken curry"]);
  expect(byIngredient.recipes[0]).toMatchObject({
    tags: ["Quick"],
    lastEaten: "2020-10-09",
    nextPlanned: "2099-12-01",
    url: `https://soba.test/recipes/${curry}`,
  });

  // "Chicken soup" is another household's.
  expect((await search({ query: "chicken" })).total).toBe(1);
  expect((await search({ tag: "quick" })).total).toBe(1);
  const all = await search({ limit: 1 });
  expect(all.total).toBe(2);
  expect(all.recipes).toHaveLength(1);
});

test("a recipe reads in full, but not another household's", async () => {
  expect(await toolJson("alice", "get_recipe", { id: curry })).toMatchObject({
    title: "Chicken curry",
    ingredients: [{ items: ["500 g kycklingfilé", "2 dl crème fraîche"] }],
    createdBy: "alice",
  });
  expect(await callTool("alice", "get_recipe", { id: theirs })).toEqual({
    isError: true,
    text: "No recipe with that ID in this household.",
  });
});

test("the meal plan lists days in range, with who planned each", async () => {
  const plan = await toolJson("alice", "get_meal_plan", { from: "2020-10-01", to: "2020-10-31" });
  expect(plan).toHaveProperty("meals", [
    {
      date: "2020-10-09",
      weekday: "Friday",
      recipe: { id: curry, title: "Chicken curry", tags: ["Quick"] },
      plannedBy: "bob",
    },
    {
      date: "2020-10-12",
      weekday: "Monday",
      recipe: { id: pancakes, title: "Pancakes", tags: [] },
      plannedBy: "alice",
    },
  ]);
  const reversed = await callTool("alice", "get_meal_plan", {
    from: "2020-10-31",
    to: "2020-10-01",
  });
  expect(reversed.isError).toBe(true);
});

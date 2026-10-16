import { describe, expect, mock, test } from "bun:test";

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
// These days are years either side of today, whatever the household's time zone.
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

// Images on the web: one PNG, and nothing else.
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const imageUrl = "https://images.test/soup.png";
globalThis.fetch = Object.assign(
  async (input: string | URL | Request) =>
    (input instanceof Request ? input.url : input.toString()) === imageUrl
      ? new Response(png)
      : new Response("Not found", { status: 404 }),
  { preconnect: () => {} },
);

const limiter = { allow: true };
// Photo keys the tools saved to and deleted from the bucket.
const savedPhotos: string[] = [];
const deletedPhotos: string[] = [];
const env = {
  BETTER_AUTH_URL: "https://soba.test",
  MCP_RATE_LIMITER: { limit: async () => ({ success: limiter.allow }) },
  PHOTOS: {
    put: async (key: string) => void savedPhotos.push(key),
    delete: async (photoKeys: string[]) => void deletedPhotos.push(...photoKeys),
  },
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

test("the server introduces the member's household and lists its tools", async () => {
  const { result } = await rpc("alice", "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "1" },
  });
  expect(result?.["instructions"]).toContain('"Household h1"');
  const { tools } = v.parse(toolsSchema, (await rpc("alice", "tools/list")).result);
  const readOnly = tools.filter((tool) => tool.annotations.readOnlyHint).map((tool) => tool.name);
  expect(readOnly).toEqual(["get_household", "search_recipes", "get_recipe", "get_meal_plan"]);
  expect(tools.map((tool) => tool.name)).toEqual([
    ...readOnly,
    "create_recipe",
    "update_recipe",
    "delete_recipe",
    "plan_meals",
    "clear_days",
    "create_tag",
    "rename_tag",
    "merge_tags",
    "delete_tag",
  ]);
});

test("the household has its members and tags", async () => {
  expect(await toolJson("bob", "get_household")).toMatchObject({
    members: [
      { name: "alice", role: "owner", isYou: false },
      { name: "bob", role: "member", isYou: true },
    ],
    recipeCount: 2,
    tags: [{ name: "Quick", recipes: 1 }],
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
  expect(all.recipes[0]).not.toHaveProperty("ingredients");
});

test("a full search reads the matching recipes in one call", async () => {
  const full = await toolJson("alice", "search_recipes", { tag: "Quick", full: true });
  expect(full).toMatchObject({
    total: 1,
    recipes: [
      {
        title: "Chicken curry",
        description: null,
        ingredients: [{ items: ["500 g kycklingfilé", "2 dl crème fraîche"] }],
        instructions: [{ items: ["Cook it."] }],
      },
    ],
  });
  expect(await toolJson("alice", "search_recipes", { full: true, limit: 1 })).toHaveProperty(
    "note",
    "Showing 1 of 2. Narrow the search, or raise the limit (at most 50 with full).",
  );
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

const createdSchema = v.object({ id: v.string(), url: v.string() });

function imageOf(id: string) {
  return sqlite
    .query<{ image_url: string | null }, [string]>("SELECT image_url FROM recipe WHERE id = ?")
    .get(id)?.image_url;
}

async function create(args: object) {
  return v.parse(createdSchema, await toolJson("alice", "create_recipe", args));
}

const soup = {
  title: "Tomatsoppa",
  ingredients: [{ heading: null, items: ["  1 kg tomater ", ""] }, { items: [] }],
  instructions: [{ items: ["Koka."] }],
};

describe("writing recipes", () => {
  test("create_recipe gives Claude the household's language and writing rules", async () => {
    const { tools } = v.parse(
      v.object({ tools: v.array(v.object({ name: v.string(), description: v.string() })) }),
      (await rpc("alice", "tools/list")).result,
    );
    const description = tools.find((tool) => tool.name === "create_recipe")?.description;
    expect(description).toContain('language code "en"');
    expect(description).toContain("amount first");
  });

  test("a new recipe is saved for the household, with only the tags it has", async () => {
    const created = await toolJson("alice", "create_recipe", { ...soup, tags: ["quick", "Soup"] });
    expect(created).toMatchObject({ ignoredTags: ["Soup"] });
    const { id, url } = v.parse(createdSchema, created);
    expect(url).toBe(`https://soba.test/recipes/${id}`);
    expect(await toolJson("bob", "get_recipe", { id })).toMatchObject({
      title: "Tomatsoppa",
      ingredients: [{ items: ["1 kg tomater"] }],
      tags: ["Quick"],
      createdBy: "alice",
    });
    expect((await callTool("stranger", "get_recipe", { id })).isError).toBe(true);
  });

  test("a recipe needs a short title and some content", async () => {
    const long = await callTool("alice", "create_recipe", { ...soup, title: "x".repeat(61) });
    expect(long).toMatchObject({ isError: true });
    expect(long.text).toContain("60 characters");
    expect(await callTool("alice", "create_recipe", { ...soup, title: "  " })).toEqual({
      isError: true,
      text: "Give the recipe a title.",
    });
    const empty = await callTool("alice", "create_recipe", {
      ...soup,
      ingredients: [{ items: [" "] }],
      instructions: [],
    });
    expect(empty).toEqual({ isError: true, text: "A recipe needs ingredients or instructions." });
  });

  test("saving the same page twice is refused unless asked for", async () => {
    const page = { ...soup, sourceUrl: "https://example.com/soppa" };
    const { id } = await create(page);
    const again = await callTool("alice", "create_recipe", page);
    expect(again.isError).toBe(true);
    expect(again.text).toContain(id);
    await create({ ...page, allowDuplicate: true });
  });

  test("an update changes only the fields given", async () => {
    const { id } = await create({
      ...soup,
      description: "Enkel soppa.",
      servings: 4,
      tags: ["Quick"],
    });
    expect(
      await toolJson("alice", "update_recipe", { id, title: "Rostad tomatsoppa", servings: null }),
    ).toMatchObject({ changed: ["title", "servings"] });
    expect(await toolJson("alice", "get_recipe", { id })).toMatchObject({
      title: "Rostad tomatsoppa",
      description: "Enkel soppa.",
      servings: null,
      ingredients: [{ items: ["1 kg tomater"] }],
      tags: ["Quick"],
    });
    await toolJson("alice", "update_recipe", { id, tags: [], description: null });
    expect(await toolJson("alice", "get_recipe", { id })).toMatchObject({
      description: null,
      tags: [],
    });
    expect(await callTool("alice", "update_recipe", { id: theirs, title: "Mine" })).toEqual({
      isError: true,
      text: "No recipe with that ID in this household.",
    });
  });

  test("a linked photo is saved as the household's own, or left out with a reason", async () => {
    const saved = await create({ ...soup, imageUrl });
    expect(saved).not.toHaveProperty("photoNote");
    const [photoKey] = savedPhotos.splice(0);
    expect(photoKey).toStartWith("households/h1/photos/");
    expect(imageOf(saved.id)).toBe(`/api/photos/${photoKey?.split("/").at(-1)}`);
    expect(await toolJson("alice", "get_recipe", { id: saved.id })).toHaveProperty(
      "hasPhoto",
      true,
    );

    const missing = await toolJson("alice", "create_recipe", {
      ...soup,
      imageUrl: "https://images.test/gone.jpg",
    });
    expect(missing).toMatchObject({
      photoNote: "The photo wasn't saved: The image's site answered 404.",
    });
  });

  test("a new photo replaces an uploaded one, and a failed one keeps it", async () => {
    const photo = "44444444-4444-4444-8444-444444444444";
    const { id } = await create(soup);
    sqlite.run("UPDATE recipe SET image_url = ? WHERE id = ?", [`/api/photos/${photo}`, id]);
    await toolJson("alice", "update_recipe", { id, imageUrl: "https://images.test/gone.jpg" });
    expect(imageOf(id)).toBe(`/api/photos/${photo}`);
    expect(deletedPhotos).toEqual([]);

    await toolJson("alice", "update_recipe", { id, imageUrl });
    expect(deletedPhotos).toEqual([`households/h1/photos/${photo}`]);
    await toolJson("alice", "update_recipe", { id, imageUrl: null });
    expect(deletedPhotos).toHaveLength(2);
    expect(imageOf(id)).toBeNull();
  });
});

describe("planning meals", () => {
  test("plan_meals plans days ahead, and says what it replaced", async () => {
    expect(
      await toolJson("alice", "plan_meals", {
        meals: [
          { date: "2099-12-02", recipeId: pancakes },
          { date: "2099-12-01", recipeId: pancakes },
        ],
      }),
    ).toEqual({
      planned: [
        { date: "2099-12-01", weekday: "Tuesday", recipe: "Pancakes" },
        { date: "2099-12-02", weekday: "Wednesday", recipe: "Pancakes" },
      ],
      replaced: [{ date: "2099-12-01", recipe: "Chicken curry" }],
    });
    const plan = await toolJson("bob", "get_meal_plan", { from: "2099-12-01", to: "2099-12-31" });
    expect(plan).toHaveProperty("meals.0.plannedBy", "alice");
  });

  test("past days, unknown recipes, and repeated dates are refused", async () => {
    for (const meals of [
      [{ date: "2020-01-01", recipeId: curry }],
      [{ date: "2099-12-03", recipeId: theirs }],
      [
        { date: "2099-12-03", recipeId: curry },
        { date: "2099-12-03", recipeId: pancakes },
      ],
    ]) {
      expect((await callTool("alice", "plan_meals", { meals })).isError).toBe(true);
    }
    const plan = await toolJson("alice", "get_meal_plan", { from: "2099-12-03", to: "2099-12-03" });
    expect(plan).toHaveProperty("meals", []);
  });

  test("clear_days removes dinners and says which days were already empty", async () => {
    expect(await toolJson("alice", "clear_days", { dates: ["2099-12-02", "2099-12-09"] })).toEqual({
      cleared: [{ date: "2099-12-02", recipe: "Pancakes" }],
      alreadyEmpty: ["2099-12-09"],
    });
    expect((await callTool("alice", "clear_days", { dates: ["2020-10-09"] })).isError).toBe(true);
  });
});

test("the import prompt asks Claude to save the recipe with create_recipe", async () => {
  const { result } = await rpc("alice", "prompts/get", {
    name: "import_recipe",
    arguments: { source: "https://example.com/kakor" },
  });
  expect(JSON.stringify(result)).toContain("the recipe at https://example.com/kakor");
});

describe("tags", () => {
  test("a tag is made on purpose, once", async () => {
    expect(await toolJson("alice", "create_tag", { name: "fisk" })).toEqual({ created: "Fisk" });
    expect((await callTool("alice", "create_tag", { name: "FISK" })).isError).toBe(true);
    const { id } = await create({ ...soup, tags: ["Fisk"] });
    expect(await toolJson("alice", "get_recipe", { id })).toHaveProperty("tags", ["Fisk"]);
  });

  test("renaming, merging, and deleting tags keep the recipes", async () => {
    expect(await toolJson("alice", "rename_tag", { name: "fisk", newName: "Fish" })).toEqual({
      renamed: "Fisk",
      to: "Fish",
      recipes: 1,
    });
    expect(await toolJson("alice", "merge_tags", { name: "Fish", into: "Quick" })).toMatchObject({
      merged: "Fish",
      into: "Quick",
    });
    expect((await callTool("alice", "rename_tag", { name: "Fish", newName: "X" })).isError).toBe(
      true,
    );
    const quick = await search({ tag: "Quick" });
    expect(await toolJson("alice", "delete_tag", { name: "quick" })).toEqual({
      deleted: "Quick",
      removedFromRecipes: quick.total,
    });
    expect(await toolJson("alice", "get_recipe", { id: curry })).toHaveProperty("tags", []);
    // Another household's tags are out of reach.
    expect((await callTool("stranger", "delete_tag", { name: "Fisk" })).isError).toBe(true);
  });
});

test("deleting a recipe takes its photo and planned days with it", async () => {
  const { id } = await create({ ...soup, imageUrl });
  const [photoKey] = savedPhotos.splice(0);
  for (const date of ["2020-05-01", "2099-11-01"]) {
    sqlite.run(
      "INSERT INTO planned_meal (household_id, date, recipe_id, planned_by, planned_at) VALUES ('h1', ?, ?, 'alice', 0)",
      [date, id],
    );
  }
  expect((await callTool("stranger", "delete_recipe", { id })).isError).toBe(true);
  expect(await toolJson("bob", "delete_recipe", { id })).toEqual({
    deleted: "Tomatsoppa",
    removedFromMealPlan: ["2099-11-01"],
    pastDinnersRemoved: 1,
  });
  expect(deletedPhotos).toContain(photoKey ?? "a saved photo");
  expect((await callTool("alice", "get_recipe", { id })).isError).toBe(true);
  expect((await callTool("alice", "delete_recipe", { id })).isError).toBe(true);
});

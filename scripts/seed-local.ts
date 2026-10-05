// Resets your household's local recipes and tags to the sample recipes, all added by you, and
// sets the household to Swedish and metric to match them. Your account, household, and members
// in D1 stay as they are. Usage: bun run db:seed [email]
//
// Recipes live in the household's sync backend (a Durable Object), so this rewrites its event
// log and gives it a new identity. Open tabs notice the change, clear their local copy, and
// sync the samples on reload.
import { Database } from "bun:sqlite";
import { join } from "node:path";

import { Schema } from "@livestore/livestore";
import { householdStoreId } from "@shared/household";
import { recipeSchema } from "@shared/recipes";
import { Glob } from "bun";

import { sampleRecipeEvents } from "./seed/seed-events";

// Where `bun run dev` keeps local Worker state; see db:migrate:local.
const stateDir = ".cloudflare/state/v3";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// Each local D1 database and Durable Object is one SQLite file beside a metadata file.
function sqliteFiles(dir: string) {
  return [...new Glob("*.sqlite").scanSync(join(stateDir, dir))]
    .filter((file) => file !== "metadata.sqlite")
    .map((file) => join(stateDir, dir, file));
}

function hasTable(db: Database, name: string) {
  return (
    db.query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !== null
  );
}

// The Durable Object caches its event log while running, so it must not be written underneath it.
const isDevServerRunning = await fetch("http://localhost:5173", {
  signal: AbortSignal.timeout(1000),
}).then(
  () => true,
  () => false,
);
if (isDevServerRunning) fail("Stop `bun run dev` first, then run this again.");

const authDbFile = sqliteFiles("d1/miniflare-D1DatabaseObject").find((file) =>
  hasTable(new Database(file), "user"),
);
if (!authDbFile) fail("No local database found. Run `bun run db:migrate:local` and sign in first.");
const authDb = new Database(authDbFile);

const email = process.argv[2];
const users = authDb
  .query<{ id: string; name: string; email: string }, []>("SELECT id, name, email FROM user")
  .all();
const user = email ? users.find((candidate) => candidate.email === email) : users[0];
if (!user) fail(email ? `No local user with the email ${email}.` : "Sign in to the app first.");
if (!email && users.length > 1) {
  fail(`Several local users exist; pass one: ${users.map((other) => other.email).join(", ")}`);
}

const household = authDb
  .query<{ id: string; name: string }, [string]>(
    "SELECT household.id, household.name FROM household_member JOIN household ON household.id = household_member.household_id WHERE household_member.user_id = ?",
  )
  .get(user.id);
if (!household) fail(`${user.email} has no household yet. Create one in the app first.`);

const storeId = householdStoreId(household.id);
const syncDbFile = sqliteFiles("do/soba-SyncBackendDO").find(
  (file) =>
    new Database(file).query<{ name: string }, []>("SELECT name FROM __miniflare_do_name").get()
      ?.name === storeId,
);
if (!syncDbFile)
  fail(`Open the app once so ${household.name} has local sync data, then run this again.`);
const syncDb = new Database(syncDbFile);

// The table names carry sync-cf's storage version, which LiveStore upgrades may change.
const tableNames = syncDb
  .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table'")
  .all()
  .map((table) => table.name);
const contextTable = tableNames.find((name) => /^context_\d+$/u.test(name));
const eventlogTable = tableNames.find((name) => /^eventlog_\d+_household_/u.test(name));
if (!contextTable || !eventlogTable) fail(`Unexpected sync tables: ${tableNames.join(", ")}`);

const events = sampleRecipeEvents(user.id);
const now = new Date().toISOString();

syncDb.transaction(() => {
  syncDb.run(`DELETE FROM "${eventlogTable}"`);
  const insert = syncDb.prepare(
    `INSERT INTO "${eventlogTable}" (seqNum, parentSeqNum, name, args, createdAt, clientId, sessionId) VALUES (?, ?, ?, ?, ?, 'seed', 'seed')`,
  );
  for (const [index, event] of events.entries()) {
    const definition = recipeSchema.eventsDefsMap.get(event.name);
    if (!definition) fail(`Unknown event ${event.name}`);
    const args = JSON.stringify(Schema.encodeSync(definition.schema)(event.args));
    insert.run(index + 1, index, event.name, args, now);
  }
  // A new backend ID tells clients the history was replaced, so they drop their local copy.
  syncDb.run(
    `INSERT OR REPLACE INTO "${contextTable}" (storeId, currentHead, backendId) VALUES (?, ?, ?)`,
    [storeId, events.length, crypto.randomUUID()],
  );
})();

// The samples are Swedish, so imports should be too.
authDb.run("UPDATE household SET language = 'sv', units = 'metric' WHERE id = ?", [household.id]);

const recipeCount = events.filter((event) => event.name === "v1.RecipeCreated").length;
console.log(
  `Seeded ${household.name} with ${recipeCount} recipes and ${events.length - recipeCount} tags, added by ${user.name} (${user.email}).`,
);
console.log(
  "Start `bun run dev` and reload open tabs; each clears its local copy and syncs the samples.",
);

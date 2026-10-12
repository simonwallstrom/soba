// Resets your household's local recipes, tags, and meal plan to the samples, all added by you, and
// sets the household to Swedish and metric to match them. Your account, household, and members
// stay as they are. Usage: bun run db:seed [email]
import { Database } from "bun:sqlite";
import { join } from "node:path";

import { Glob } from "bun";

import { sampleHouseholdData } from "./seed/seed-data";

// Where `bun run dev` keeps local Worker state; see db:migrate:local.
const stateDir = ".cloudflare/state/v3";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// Each local D1 database is one SQLite file beside a metadata file.
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

// The dev server holds the database open, so it must not be written underneath it.
const isDevServerRunning = await fetch("http://localhost:5173", {
  signal: AbortSignal.timeout(1000),
}).then(
  () => true,
  () => false,
);
if (isDevServerRunning) fail("Stop `bun run dev` first, then run this again.");

const dbFile = sqliteFiles("d1/miniflare-D1DatabaseObject").find((file) =>
  hasTable(new Database(file), "recipe"),
);
if (!dbFile) fail("No local database found. Run `bun run db:migrate:local` and sign in first.");
const db = new Database(dbFile);
// Deleting a recipe takes its tags, profile, and planned meals with it.
db.run("PRAGMA foreign_keys = ON");

const email = process.argv[2];
const users = db
  .query<{ id: string; name: string; email: string }, []>("SELECT id, name, email FROM user")
  .all();
const user = email ? users.find((candidate) => candidate.email === email) : users[0];
if (!user) fail(email ? `No local user with the email ${email}.` : "Sign in to the app first.");
if (!email && users.length > 1) {
  fail(`Several local users exist; pass one: ${users.map((other) => other.email).join(", ")}`);
}

const household = db
  .query<{ id: string; name: string }, [string]>(
    "SELECT household.id, household.name FROM household_member JOIN household ON household.id = household_member.household_id WHERE household_member.user_id = ?",
  )
  .get(user.id);
if (!household) fail(`${user.email} has no household yet. Create one in the app first.`);

const { tags, recipes, meals } = sampleHouseholdData(user.id);

db.transaction(() => {
  db.run("DELETE FROM recipe WHERE household_id = ?", [household.id]);
  db.run("DELETE FROM tag WHERE household_id = ?", [household.id]);
  for (const tag of tags) {
    db.run("INSERT INTO tag (id, household_id, name, created_at) VALUES (?, ?, ?, ?)", [
      tag.id,
      household.id,
      tag.name,
      tag.createdAt.getTime(),
    ]);
  }
  for (const recipe of recipes) {
    db.run(
      "INSERT INTO recipe (id, household_id, title, description, servings, image_url, ingredients, instructions, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        recipe.id,
        household.id,
        recipe.title,
        recipe.description,
        recipe.servings,
        recipe.imageUrl,
        JSON.stringify(recipe.ingredients),
        JSON.stringify(recipe.instructions),
        recipe.createdBy,
        recipe.createdBy,
        recipe.createdAt.getTime(),
        recipe.createdAt.getTime(),
      ],
    );
    for (const tagId of recipe.tagIds) {
      db.run("INSERT INTO recipe_tag (recipe_id, tag_id) VALUES (?, ?)", [recipe.id, tagId]);
    }
    const { profile } = recipe;
    db.run(
      "INSERT INTO recipe_profile (recipe_id, is_dinner, base, protein, effort, is_treat, version, source_hash, profiled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        recipe.id,
        profile.isDinner,
        profile.base,
        profile.protein,
        profile.effort,
        profile.isTreat,
        profile.version,
        profile.sourceHash,
        recipe.createdAt.getTime(),
      ],
    );
  }
  for (const meal of meals) {
    db.run(
      "INSERT INTO planned_meal (household_id, date, recipe_id, planned_by, planned_at) VALUES (?, ?, ?, ?, ?)",
      [household.id, meal.date, meal.recipeId, meal.plannedBy, meal.plannedAt.getTime()],
    );
  }
  // The samples are Swedish, so imports should be too.
  db.run("UPDATE household SET language = 'sv', units = 'metric' WHERE id = ?", [household.id]);
})();

console.log(
  `Seeded ${household.name} with ${recipes.length} recipes, ${tags.length} tags, and ${meals.length} planned dinners, added by ${user.name} (${user.email}).`,
);
console.log("Start `bun run dev` and reload open tabs to see the samples.");

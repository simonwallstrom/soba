// An in-memory stand-in for the Worker's D1 database, with every migration applied, so tests
// run the real queries. Implements just the D1 methods Drizzle calls.
import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { drizzle } from "drizzle-orm/d1";

import * as schema from "../../src/server/db/schema";

const migrationsDir = join(import.meta.dir, "../../drizzle/migrations");

type Value = string | number | bigint | boolean | null | Uint8Array;

function statement(sqlite: Database, sql: string, params: Value[] = []) {
  const all = () => ({ results: sqlite.query(sql).all(...params), success: true, meta: {} });
  return {
    bind: (...values: Value[]) => statement(sqlite, sql, values),
    all: async () => all(),
    run: async () => all(),
    raw: async () => sqlite.query(sql).values(...params),
    allNow: all,
  };
}

export function createMemoryDatabase() {
  const sqlite = new Database(":memory:");
  // D1 enforces foreign keys, which deleting recipes and households relies on.
  sqlite.run("PRAGMA foreign_keys = ON");
  for (const file of readdirSync(migrationsDir).toSorted()) {
    if (!file.endsWith(".sql")) continue;
    for (const sql of readFileSync(join(migrationsDir, file), "utf8").split(
      "--> statement-breakpoint",
    )) {
      sqlite.run(sql);
    }
  }
  const d1 = {
    prepare: (sql: string) => statement(sqlite, sql),
    // Like D1, a batch is one transaction.
    batch: async (statements: ReturnType<typeof statement>[]) =>
      sqlite.transaction(() => statements.map((prepared) => prepared.allNow()))(),
  };
  return { sqlite, db: drizzle(d1, { schema }) };
}

// A household with its members, the first of them the owner.
export function addHousehold(sqlite: Database, id: string, userIds: readonly string[]) {
  sqlite.run("INSERT INTO household (id, name) VALUES (?, ?)", [id, `Household ${id}`]);
  for (const [index, userId] of userIds.entries()) {
    sqlite.run("INSERT INTO user (id, name, email) VALUES (?, ?, ?)", [
      userId,
      userId,
      `${userId}@example.com`,
    ]);
    sqlite.run("INSERT INTO household_member (user_id, household_id, role) VALUES (?, ?, ?)", [
      userId,
      id,
      index === 0 ? "owner" : "member",
    ]);
  }
}

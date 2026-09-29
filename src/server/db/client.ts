import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

function createDatabase() {
  return drizzle(env.DB, { schema });
}

type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

export function getDatabase() {
  return (database ??= createDatabase());
}

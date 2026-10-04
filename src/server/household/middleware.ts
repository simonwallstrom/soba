import { createMiddleware } from "hono/factory";

import type { SessionEnv } from "../auth/middleware";
import { getMembership } from "./household";
import type { Membership } from "./household";

export type HouseholdEnv = {
  Bindings: Env;
  Variables: SessionEnv["Variables"] & { membership: Membership };
};

// Runs after requireSession.
export const requireHousehold = createMiddleware<HouseholdEnv>(async (c, next) => {
  const membership = await getMembership(c.get("user").id);
  if (!membership) return c.json({ error: "Household required" }, 404);
  c.set("membership", membership);
  return next();
});

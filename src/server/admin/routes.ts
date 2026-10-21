import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import * as v from "valibot";

import { getSession } from "../auth/auth";
import type { SessionEnv } from "../auth/middleware";
import { isListed } from "../auth/policy";
import { validateJson } from "../lib/validate";
import { addBetaInvite, listBetaAccess, removeBetaInvite } from "./beta";
import { listUsers } from "./users";

// Admins are listed in ADMIN_EMAILS. Everyone else, logged in or not, gets the same 404 as a path
// that doesn't exist, so the admin routes don't give themselves away.
const requireAdmin = createMiddleware<SessionEnv>(async (c, next) => {
  const session = await getSession(c.req.raw.headers);
  if (!session || !isListed(session.user.email, c.env.ADMIN_EMAILS)) return c.notFound();
  c.set("user", session.user);
  c.set("sessionId", session.sessionId);
  return next();
});

const emailSchema = v.pipe(v.string(), v.trim(), v.email("Enter an email address"));

export const adminRoutes = new Hono<SessionEnv>()
  .use(requireAdmin)
  .use((c, next) => {
    c.header("Cache-Control", "private, no-store");
    return next();
  })
  .get("/users", async (c) => c.json({ users: await listUsers() }, 200))
  .get("/beta", async (c) => c.json({ access: await listBetaAccess(c.env.ADMIN_EMAILS) }, 200))
  // Only stops new sign-ups: anyone already in keeps their account.
  .post("/beta", validateJson(v.object({ email: emailSchema })), async (c) => {
    await addBetaInvite(c.req.valid("json").email, c.get("user").id);
    return c.json({ ok: true }, 200);
  })
  .delete("/beta/:email", async (c) => {
    const removed = await removeBetaInvite(c.req.param("email"));
    if (!removed) return c.json({ error: "This email isn’t on the list" }, 404);
    return c.json({ ok: true }, 200);
  });

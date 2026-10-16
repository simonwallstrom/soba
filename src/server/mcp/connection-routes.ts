import { Hono } from "hono";

import { requireSession } from "../auth/middleware";
import type { SessionEnv } from "../auth/middleware";
import { listConnections, revokeConnection } from "./connections";

// The member's own connected apps, listed and revoked on the "Use with Claude" page.
export const connectionRoutes = new Hono<SessionEnv>()
  .use(requireSession)
  .get("/", async (c) => {
    c.header("Cache-Control", "private, no-store");
    return c.json({ connections: await listConnections(c.get("user").id) }, 200);
  })
  .delete("/:clientId", async (c) => {
    const revoked = await revokeConnection(c.get("user").id, c.req.param("clientId"));
    if (!revoked) return c.json({ error: "This app isn't connected" }, 404);
    return c.json({ ok: true }, 200);
  });

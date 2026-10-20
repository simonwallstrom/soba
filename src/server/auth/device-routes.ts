import { Hono } from "hono";

import { listDevices, revokeDevice, revokeOtherDevices } from "./devices";
import { requireSession } from "./middleware";
import type { SessionEnv } from "./middleware";

// The member's own sessions, listed and logged out in the Devices group in Settings.
export const deviceRoutes = new Hono<SessionEnv>()
  .use(requireSession)
  .get("/", async (c) => {
    c.header("Cache-Control", "private, no-store");
    return c.json({ devices: await listDevices(c.get("user").id, c.get("sessionId")) }, 200);
  })
  .delete("/others", async (c) => {
    await revokeOtherDevices(c.get("user").id, c.get("sessionId"));
    return c.json({ ok: true }, 200);
  })
  .delete("/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    // This device logs out through the Profile group, which also clears its local data.
    if (sessionId === c.get("sessionId")) return c.json({ error: "Log out here instead" }, 400);
    const revoked = await revokeDevice(c.get("user").id, sessionId);
    if (!revoked) return c.json({ error: "This device is already logged out" }, 404);
    return c.json({ ok: true }, 200);
  });

import { createMcpHandler } from "@modelcontextprotocol/server";
import { Hono } from "hono";

import { requireMcpToken } from "./auth";
import type { McpEnv } from "./auth";
import { createServer } from "./server";

// The MCP server that Claude and other MCP clients connect to. Each request builds a server for
// the token's member, with no sessions between requests. See docs/mcp.md.
export const mcpRoutes = new Hono<McpEnv>()
  .use(requireMcpToken)
  // Keyed by member: every claude.ai user calls from Claude's own servers.
  .use(async (c, next) => {
    const { success } = await c.env.MCP_RATE_LIMITER.limit({ key: c.get("userId") });
    if (!success) {
      return c.json(
        {
          jsonrpc: "2.0",
          error: { code: -32000, message: "Too many requests. Try again in a minute." },
          id: null,
        },
        429,
      );
    }
    return next();
  })
  .all("/", (c) =>
    createMcpHandler(() =>
      createServer({
        membership: c.get("membership"),
        userId: c.get("userId"),
        appUrl: new URL(c.env.BETTER_AUTH_URL).origin,
        // Calendar dates are the household's own; UTC is close enough to pick the default range.
        today: new Date().toISOString().slice(0, 10),
        photos: c.env.PHOTOS,
      }),
    ).fetch(c.req.raw),
  );

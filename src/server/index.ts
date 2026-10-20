import { getSessionCookie } from "better-auth/cookies";
import { Hono } from "hono";
import { csrf } from "hono/csrf";

import { getSession, handleAuth } from "./auth/auth";
import { deviceRoutes } from "./auth/device-routes";
import { rateLimit } from "./auth/middleware";
import { isAllowlisted } from "./auth/policy";
import { getMembership } from "./household/household";
import { householdRoutes, inviteRoutes } from "./household/routes";
import { connectionRoutes } from "./mcp/connection-routes";
import { mcpRoutes } from "./mcp/routes";
import { mealPlanRoutes } from "./meal-plan/routes";
import { photoRoutes } from "./photos/routes";
import { recipeImportRoutes } from "./recipe-import/routes";
import { recipeRoutes } from "./recipes/routes";
import { tagRoutes } from "./tags/routes";

export { RecipeImportWorkflow } from "./recipe-import/workflow";

// OAuth endpoints that MCP clients call from their own servers. They authenticate the client
// and code, never a cookie, so a cross-site request can't act as a member through them.
const oauthClientPaths = new Set([
  "/api/auth/oauth2/register",
  "/api/auth/oauth2/token",
  "/api/auth/oauth2/revoke",
  "/api/auth/oauth2/introspect",
]);

const app = new Hono<{ Bindings: Env }>()
  .use("/api/*", (c, next) =>
    oauthClientPaths.has(c.req.path)
      ? next()
      : csrf({
          origin: (origin) => origin === new URL(c.env.BETTER_AUTH_URL).origin,
        })(c, next),
  )
  .use("/api/auth/*", rateLimit)
  .use("/api/invites/*", rateLimit)
  .get("/", async (c) => {
    c.header("Cache-Control", "no-store");
    // A signed `sig` is an MCP client's login request, which must reach the start page.
    if (getSessionCookie(c.req.raw) && !c.req.query("sig")) return c.redirect("/recipes", 302);
    const asset = await c.env.ASSETS.fetch(c.req.raw);
    const response = new Response(asset.body, asset);
    response.headers.set("Cache-Control", "no-store");
    return response;
  })
  .get("/api/me", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const session = await getSession(c.req.raw.headers, {
      onSetCookie: (cookie) => c.header("Set-Cookie", cookie, { append: true }),
    });
    if (!session) return c.json({ user: null, household: null, canCreateHousehold: false });
    const household = await getMembership(session.user.id);
    return c.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      },
      household,
      canCreateHousehold:
        !household && isAllowlisted(session.user.email, c.env.AUTH_ALLOWED_EMAILS),
    });
  })
  // Deletes what this browser stored, such as the cached session, after logout or removal.
  .post("/api/local-data/clear", (c) => {
    c.header("Clear-Site-Data", '"storage"');
    return c.body(null, 204);
  })
  .route("/api/connections", connectionRoutes)
  .route("/api/devices", deviceRoutes)
  .route("/api/household", householdRoutes)
  .route("/api/invites", inviteRoutes)
  .route("/api/photos", photoRoutes)
  .route("/api/recipe-import", recipeImportRoutes)
  .route("/api/recipes", recipeRoutes)
  .route("/api/tags", tagRoutes)
  .route("/api/meal-plan", mealPlanRoutes)
  .on(["GET", "POST"], "/api/auth/*", (c) => handleAuth(c.req.raw))
  // OAuth discovery for MCP clients, served by Better Auth. See src/server/mcp.
  .get("/.well-known/*", (c) => handleAuth(c.req.raw))
  .route("/mcp", mcpRoutes);

export type AppType = typeof app;
export default { fetch: app.fetch } satisfies ExportedHandler<Env>;

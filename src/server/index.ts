import { makeWorker } from "@livestore/sync-cf/cf-worker";
import { getSessionCookie } from "better-auth/cookies";
import { Hono } from "hono";
import { csrf } from "hono/csrf";

import { getSession, handleAuth } from "./auth/auth";
import { rateLimit } from "./auth/middleware";
import { isAllowlisted } from "./auth/policy";
import { assertStoreAccess } from "./auth/store-access";
import { getMembership } from "./household/household";
import { householdRoutes, inviteRoutes } from "./household/routes";

export { SyncBackendDO } from "./sync";

// sync-cf bundles older Cloudflare types than Wrangler generates; bridge that type boundary here.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const createSyncWorker = makeWorker as unknown as (options: {
  syncBackendBinding: "SYNC_BACKEND_DO";
}) => { fetch: (request: Request, env: Env, context: unknown) => Promise<Response> };

const syncWorker = createSyncWorker({ syncBackendBinding: "SYNC_BACKEND_DO" });

const app = new Hono<{ Bindings: Env }>()
  .use("/api/*", csrf({ origin: (origin, c) => origin === new URL(c.env.BETTER_AUTH_URL).origin }))
  .use("/api/auth/*", rateLimit)
  .use("/api/invites/*", rateLimit)
  .get("/", async (c) => {
    c.header("Cache-Control", "no-store");
    if (getSessionCookie(c.req.raw)) return c.redirect("/recipes", 302);
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
      user: { id: session.user.id, name: session.user.name, email: session.user.email },
      household,
      canCreateHousehold:
        !household && isAllowlisted(session.user.email, c.env.AUTH_ALLOWED_EMAILS),
    });
  })
  // Deletes this browser's local recipe database and cached session after logout or removal.
  .post("/api/local-data/clear", (c) => {
    c.header("Clear-Site-Data", '"storage"');
    return c.body(null, 204);
  })
  .route("/api/household", householdRoutes)
  .route("/api/invites", inviteRoutes)
  .all("/api/sync", async (c) => {
    const storeId = new URL(c.req.url).searchParams.get("storeId");
    if (!storeId) return c.text("Missing store ID", 400);
    try {
      await assertStoreAccess(storeId, c.req.header("cookie"));
    } catch {
      return c.text("Unauthorized", 401);
    }
    return syncWorker.fetch(c.req.raw, c.env, c.executionCtx);
  })
  .on(["GET", "POST"], "/api/auth/*", (c) => handleAuth(c.req.raw));

export type AppType = typeof app;
export default app;

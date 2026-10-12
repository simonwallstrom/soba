import { getSessionCookie } from "better-auth/cookies";
import { Hono } from "hono";
import { csrf } from "hono/csrf";

import { getSession, handleAuth } from "./auth/auth";
import { rateLimit } from "./auth/middleware";
import { isAllowlisted } from "./auth/policy";
import { getMembership } from "./household/household";
import { householdRoutes, inviteRoutes } from "./household/routes";
import { mealPlanRoutes } from "./meal-plan/routes";
import { photoRoutes } from "./photos/routes";
import { recipeImportRoutes } from "./recipe-import/routes";
import { recipeRoutes } from "./recipes/routes";

export { RecipeImportWorkflow } from "./recipe-import/workflow";

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
  .route("/api/household", householdRoutes)
  .route("/api/invites", inviteRoutes)
  .route("/api/photos", photoRoutes)
  .route("/api/recipe-import", recipeImportRoutes)
  .route("/api/recipes", recipeRoutes)
  .route("/api/meal-plan", mealPlanRoutes)
  .on(["GET", "POST"], "/api/auth/*", (c) => handleAuth(c.req.raw));

export type AppType = typeof app;
export default app;

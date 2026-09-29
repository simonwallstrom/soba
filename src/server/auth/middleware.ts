import { createMiddleware } from "hono/factory";

import { getSession } from "./auth";

type SessionUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"];

export type SessionEnv = { Bindings: Env; Variables: { user: SessionUser } };

export const requireSession = createMiddleware<SessionEnv>(async (c, next) => {
  const session = await getSession(c.req.raw.headers, {
    onSetCookie: (cookie) => c.header("Set-Cookie", cookie, { append: true }),
  });
  if (!session) return c.json({ error: "Log in first" }, 401);
  c.set("user", session.user);
  return next();
});

export const rateLimit = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const key = c.req.header("cf-connecting-ip") ?? "unknown";
  const { success } = await c.env.AUTH_RATE_LIMITER.limit({ key });
  if (!success) return c.json({ error: "Too many requests. Try again in a minute." }, 429);
  return next();
});

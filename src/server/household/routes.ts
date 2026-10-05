import { householdLanguages, householdUnits } from "@shared/household";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import * as v from "valibot";

import { requireSession } from "../auth/middleware";
import type { SessionEnv } from "../auth/middleware";
import { isAllowlisted } from "../auth/policy";
import { validateJson } from "../lib/validate";
import {
  createHousehold,
  findInvite,
  getInviteToken,
  joinHousehold,
  leaveHousehold,
  listMembers,
  removeMember,
  resetInviteToken,
  updateHouseholdSettings,
} from "./household";
import { requireHousehold } from "./middleware";
import type { HouseholdEnv } from "./middleware";

const requireOwner = createMiddleware<HouseholdEnv>(async (c, next) => {
  if (c.get("membership").role !== "owner") {
    return c.json({ error: "Only the household owner can do this" }, 403);
  }
  return next();
});

const settingsSchema = {
  language: v.picklist(
    householdLanguages.map((language) => language.value),
    "Choose a language",
  ),
  units: v.picklist(
    householdUnits.map((units) => units.value),
    "Choose units",
  ),
};

function inviteUrl(requestUrl: string, token: string) {
  return new URL(`/invite/${token}`, requestUrl).toString();
}

export const householdRoutes = new Hono<SessionEnv>()
  .use(requireSession)
  .post(
    "/",
    validateJson(
      v.object({
        name: v.pipe(
          v.string(),
          v.trim(),
          v.minLength(1, "Enter a household name"),
          v.maxLength(80, "Use at most 80 characters"),
        ),
        ...settingsSchema,
      }),
    ),
    async (c) => {
      const user = c.get("user");
      if (!isAllowlisted(user.email, c.env.AUTH_ALLOWED_EMAILS)) {
        return c.json({ error: "Ask your family for an invite link to join their household" }, 403);
      }
      const created = await createHousehold(c.req.valid("json"), user.id);
      if (!created) return c.json({ error: "You are already in a household" }, 409);
      return c.json({ ok: true }, 200);
    },
  )
  .get("/", requireHousehold, async (c) => {
    const membership = c.get("membership");
    const [members, token] = await Promise.all([
      listMembers(membership.id),
      membership.role === "owner" ? getInviteToken(membership.id) : null,
    ]);
    return c.json({ members, inviteUrl: token ? inviteUrl(c.req.url, token) : null }, 200);
  })
  // Any member can change how imported recipes are written.
  .put("/settings", requireHousehold, validateJson(v.object(settingsSchema)), async (c) => {
    await updateHouseholdSettings(c.get("membership").id, c.req.valid("json"));
    return c.json({ ok: true }, 200);
  })
  .post("/invite/reset", requireHousehold, requireOwner, async (c) => {
    const token = await resetInviteToken(c.get("membership").id, c.get("user").id);
    return c.json({ inviteUrl: inviteUrl(c.req.url, token) }, 200);
  })
  .delete("/members/:userId", requireHousehold, requireOwner, async (c) => {
    const removed = await removeMember(c.get("membership").id, c.req.param("userId"));
    if (!removed) return c.json({ error: "Member not found" }, 404);
    return c.json({ ok: true }, 200);
  })
  .post("/leave", requireHousehold, async (c) => {
    const left = await leaveHousehold(c.get("user").id, c.get("membership"));
    if (!left) return c.json({ error: "Remove the other members before leaving" }, 409);
    return c.json({ ok: true }, 200);
  });

export const inviteRoutes = new Hono<SessionEnv>()
  .get("/:token", async (c) => {
    c.header("Cache-Control", "private, no-store");
    const invite = await findInvite(c.req.param("token"));
    if (!invite) return c.json({ error: "This invite link is no longer valid" }, 404);
    return c.json({ householdName: invite.householdName, inviterName: invite.inviterName }, 200);
  })
  .post("/:token/join", requireSession, async (c) => {
    const invite = await findInvite(c.req.param("token"));
    if (!invite) return c.json({ error: "This invite link is no longer valid" }, 404);
    const result = await joinHousehold(c.get("user").id, invite.householdId);
    if (result === "full") return c.json({ error: "This household is full" }, 409);
    if (result === "already-member") {
      return c.json({ error: "You are already in a household" }, 409);
    }
    return c.json({ ok: true }, 200);
  });

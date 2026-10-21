import { MAX_HOUSEHOLD_MEMBERS } from "@shared/household";
import type { HouseholdLanguage, HouseholdUnits } from "@shared/household";
import { and, count, eq, isNotNull, ne } from "drizzle-orm";

import { getDatabase } from "../db/client";
import { isUniqueViolation } from "../db/errors";
import { householdInvites, householdMembers, households, users } from "../db/schema";

export type HouseholdSettings = {
  language: HouseholdLanguage;
  units: HouseholdUnits;
  timeZone: string;
};

export type Membership = HouseholdSettings & {
  id: string;
  name: string;
  role: "owner" | "member";
  checklistHidden: boolean;
};

export async function getMembership(userId: string): Promise<Membership | null> {
  const [membership] = await getDatabase()
    .select({
      id: households.id,
      name: households.name,
      role: householdMembers.role,
      language: households.language,
      units: households.units,
      timeZone: households.timeZone,
      checklistHidden: isNotNull(householdMembers.checklistHiddenAt).mapWith(Boolean),
    })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(eq(householdMembers.userId, userId))
    .limit(1);
  return membership ?? null;
}

export async function hideChecklist(userId: string) {
  await getDatabase()
    .update(householdMembers)
    .set({ checklistHiddenAt: new Date() })
    .where(eq(householdMembers.userId, userId));
}

export async function isMember(userId: string, householdId: string) {
  const [member] = await getDatabase()
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, userId), eq(householdMembers.householdId, householdId)))
    .limit(1);
  return member !== undefined;
}

/** Returns false when the user already belongs to a household. */
export async function createHousehold(
  { name, ...settings }: HouseholdSettings & { name: string },
  userId: string,
) {
  const db = getDatabase();
  const householdId = crypto.randomUUID();
  try {
    await db.batch([
      db.insert(households).values({ id: householdId, name, ...settings }),
      db.insert(householdMembers).values({ userId, householdId, role: "owner" }),
      db
        .insert(householdInvites)
        .values({ householdId, token: crypto.randomUUID(), createdBy: userId }),
    ]);
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
}

export async function updateHouseholdSettings(householdId: string, settings: HouseholdSettings) {
  await getDatabase().update(households).set(settings).where(eq(households.id, householdId));
}

export async function renameHousehold(householdId: string, name: string) {
  await getDatabase().update(households).set({ name }).where(eq(households.id, householdId));
}

export async function listMembers(householdId: string) {
  return getDatabase()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: householdMembers.role,
    })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .where(eq(householdMembers.householdId, householdId))
    .orderBy(householdMembers.createdAt);
}

/** The household's invite token while its link is switched on. */
export async function getInviteToken(householdId: string) {
  const [invite] = await getDatabase()
    .select({ token: householdInvites.token })
    .from(householdInvites)
    .where(and(eq(householdInvites.householdId, householdId), eq(householdInvites.enabled, true)))
    .limit(1);
  return invite?.token ?? null;
}

/** Switches the invite link on, with the token it had, or a new one if it never had one. */
export async function enableInvite(householdId: string, userId: string) {
  const [invite] = await getDatabase()
    .insert(householdInvites)
    .values({ householdId, token: crypto.randomUUID(), createdBy: userId })
    .onConflictDoUpdate({ target: householdInvites.householdId, set: { enabled: true } })
    .returning({ token: householdInvites.token });
  return invite!.token;
}

/** Replaces the household's invite link with a new one, and switches it on. */
export async function resetInviteToken(householdId: string, userId: string) {
  const token = crypto.randomUUID();
  await getDatabase()
    .insert(householdInvites)
    .values({ householdId, token, createdBy: userId })
    .onConflictDoUpdate({
      target: householdInvites.householdId,
      set: { token, enabled: true, createdBy: userId, createdAt: new Date() },
    });
  return token;
}

/** Switches the invite link off. It keeps its token, so switching it on brings it back. */
export async function disableInvite(householdId: string) {
  await getDatabase()
    .update(householdInvites)
    .set({ enabled: false })
    .where(eq(householdInvites.householdId, householdId));
}

export async function findInvite(token: string) {
  const [invite] = await getDatabase()
    .select({
      householdId: households.id,
      householdName: households.name,
      inviterName: users.name,
      inviterImage: users.image,
    })
    .from(householdInvites)
    .innerJoin(households, eq(householdInvites.householdId, households.id))
    .innerJoin(users, eq(householdInvites.createdBy, users.id))
    .where(and(eq(householdInvites.token, token), eq(householdInvites.enabled, true)))
    .limit(1);
  return invite ?? null;
}

export async function joinHousehold(
  userId: string,
  householdId: string,
): Promise<"joined" | "full" | "already-member"> {
  const db = getDatabase();
  const [members] = await db
    .select({ total: count() })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, householdId));
  if ((members?.total ?? 0) >= MAX_HOUSEHOLD_MEMBERS) return "full";
  try {
    await db.insert(householdMembers).values({ userId, householdId, role: "member" });
    return "joined";
  } catch (error) {
    if (isUniqueViolation(error)) return "already-member";
    throw error;
  }
}

/** Owners cannot be removed; they leave by deleting an otherwise empty household. */
export async function removeMember(householdId: string, userId: string) {
  const removed = await getDatabase()
    .delete(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, userId),
        ne(householdMembers.role, "owner"),
      ),
    )
    .returning({ userId: householdMembers.userId });
  return removed.length > 0;
}

/** Returns false when an owner tries to leave a household that still has other members. */
export async function leaveHousehold(userId: string, membership: Membership) {
  const db = getDatabase();
  if (membership.role === "member") {
    await db.delete(householdMembers).where(eq(householdMembers.userId, userId));
    return true;
  }
  const [members] = await db
    .select({ total: count() })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, membership.id));
  if ((members?.total ?? 0) > 1) return false;
  await db.delete(households).where(eq(households.id, membership.id));
  return true;
}

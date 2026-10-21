import { asc, eq } from "drizzle-orm";

import { isListed, normalizeEmail } from "../auth/policy";
import { getDatabase } from "../db/client";
import { betaInvites, users } from "../db/schema";

/**
 * Whether an email may sign up without an invite link, and create a household: it's on the beta
 * list, or it's an admin's. Admins are always let in, so nobody can lock themselves out.
 */
export async function isAllowlisted(email: string, adminEmails: string) {
  if (isListed(email, adminEmails)) return true;
  const [invite] = await getDatabase()
    .select({ email: betaInvites.email })
    .from(betaInvites)
    .where(eq(betaInvites.email, normalizeEmail(email)))
    .limit(1);
  return invite !== undefined;
}

/**
 * Everyone let in: the admins first, then the beta list, oldest first. Whether someone has signed
 * up comes from their account, so it stays right however they got in.
 */
export async function listBetaAccess(adminEmails: string) {
  const db = getDatabase();
  const [invites, accounts] = await Promise.all([
    db
      .select({
        email: betaInvites.email,
        addedByName: users.name,
        createdAt: betaInvites.createdAt,
      })
      .from(betaInvites)
      .leftJoin(users, eq(users.id, betaInvites.addedBy))
      .orderBy(asc(betaInvites.createdAt)),
    db.select({ email: users.email, createdAt: users.createdAt }).from(users),
  ]);
  const signedUp = new Map(accounts.map(({ email, createdAt }) => [email, createdAt]));
  const admins = [
    ...new Set(
      adminEmails
        .split(",")
        .map(normalizeEmail)
        .filter((email) => email !== ""),
    ),
  ];

  return [
    ...admins.map((email) => ({
      email,
      admin: true,
      addedByName: null,
      addedAt: null,
      signedUpAt: signedUp.get(email)?.toISOString() ?? null,
    })),
    ...invites
      .filter(({ email }) => !admins.includes(email))
      .map(({ email, addedByName, createdAt }) => ({
        email,
        admin: false,
        addedByName,
        addedAt: createdAt.toISOString(),
        signedUpAt: signedUp.get(email)?.toISOString() ?? null,
      })),
  ];
}

/** Adding an email already on the list keeps it as it was. */
export async function addBetaInvite(email: string, addedBy: string) {
  await getDatabase()
    .insert(betaInvites)
    .values({ email: normalizeEmail(email), addedBy })
    .onConflictDoNothing();
}

export async function removeBetaInvite(email: string) {
  const deleted = await getDatabase()
    .delete(betaInvites)
    .where(eq(betaInvites.email, normalizeEmail(email)))
    .returning({ email: betaInvites.email });
  return deleted.length > 0;
}

import { and, desc, eq, gt, ne } from "drizzle-orm";

import { getDatabase } from "../db/client";
import { sessions } from "../db/schema";

// Read from D1 rather than Better Auth's list-sessions, which only answers sessions younger than
// a day. Tokens stay on the server; the client names each device from its user agent.

/** Where the member is logged in, most recently used first. */
export async function listDevices(userId: string, currentSessionId: string) {
  const rows = await getDatabase()
    .select({ id: sessions.id, userAgent: sessions.userAgent, updatedAt: sessions.updatedAt })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.updatedAt));
  return rows.map((row) => ({
    id: row.id,
    userAgent: row.userAgent ?? "",
    updatedAt: row.updatedAt.toISOString(),
    current: row.id === currentSessionId,
  }));
}

/** Logs out one of the member's sessions. The cookie cache can keep it working for 5 minutes. */
export async function revokeDevice(userId: string, sessionId: string) {
  const deleted = await getDatabase()
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.id, sessionId)))
    .returning({ id: sessions.id });
  return deleted.length > 0;
}

/** Logs out every session but the current one. */
export async function revokeOtherDevices(userId: string, currentSessionId: string) {
  await getDatabase()
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, currentSessionId)));
}

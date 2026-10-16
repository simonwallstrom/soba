import { and, desc, eq, max } from "drizzle-orm";

import { getDatabase } from "../db/client";
import { oauthAccessTokens, oauthClients, oauthConsents, oauthRefreshTokens } from "../db/schema";

/**
 * The apps a member let in, like Claude, newest first. An app refreshes its token when it's used
 * after an hour, so the newest refresh token says roughly when it last was.
 */
export async function listConnections(userId: string) {
  const rows = await getDatabase()
    .select({
      clientId: oauthConsents.clientId,
      name: oauthClients.name,
      uri: oauthClients.uri,
      redirectUris: oauthClients.redirectUris,
      connectedAt: oauthConsents.createdAt,
      lastUsedAt: max(oauthRefreshTokens.createdAt),
    })
    .from(oauthConsents)
    .innerJoin(oauthClients, eq(oauthClients.clientId, oauthConsents.clientId))
    .leftJoin(
      oauthRefreshTokens,
      and(
        eq(oauthRefreshTokens.clientId, oauthConsents.clientId),
        eq(oauthRefreshTokens.userId, userId),
      ),
    )
    .where(eq(oauthConsents.userId, userId))
    .groupBy(oauthConsents.id)
    .orderBy(desc(oauthConsents.createdAt));
  return rows.map(({ redirectUris, connectedAt, lastUsedAt, ...row }) => ({
    ...row,
    // Any app can register under any name, so where it sends members back is what identifies it.
    host: firstHost(redirectUris),
    connectedAt: connectedAt?.toISOString() ?? null,
    lastUsedAt: lastUsedAt ? new Date(lastUsedAt).toISOString() : null,
  }));
}

function firstHost(redirectUris: string) {
  // Better Auth stores the list as JSON, or comma-separated in older rows.
  let uris: unknown;
  try {
    uris = JSON.parse(redirectUris);
  } catch {
    uris = redirectUris.split(",");
  }
  const first = Array.isArray(uris) ? uris[0] : null;
  return typeof first === "string" && URL.canParse(first) ? new URL(first).host : null;
}

/**
 * Takes away an app's access: its consent and every token it holds for the member. Access tokens
 * are JWTs checked without the database, so requireMcpToken also checks the consent is still here.
 */
export async function revokeConnection(userId: string, clientId: string) {
  const db = getDatabase();
  const [consents] = await db.batch([
    db
      .delete(oauthConsents)
      .where(and(eq(oauthConsents.userId, userId), eq(oauthConsents.clientId, clientId)))
      .returning({ id: oauthConsents.id }),
    db
      .delete(oauthAccessTokens)
      .where(and(eq(oauthAccessTokens.userId, userId), eq(oauthAccessTokens.clientId, clientId))),
    db
      .delete(oauthRefreshTokens)
      .where(and(eq(oauthRefreshTokens.userId, userId), eq(oauthRefreshTokens.clientId, clientId))),
  ]);
  return consents.length > 0;
}

export async function isConnected(userId: string, clientId: string) {
  const [consent] = await getDatabase()
    .select({ id: oauthConsents.id })
    .from(oauthConsents)
    .where(and(eq(oauthConsents.userId, userId), eq(oauthConsents.clientId, clientId)))
    .limit(1);
  return consent !== undefined;
}

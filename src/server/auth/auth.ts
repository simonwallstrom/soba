import { mcp } from "@better-auth/mcp";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, getOAuthState } from "better-auth/api";
import { getCookies, getSessionCookie } from "better-auth/cookies";
import { betterAuth } from "better-auth/minimal";
import { jwt } from "better-auth/plugins/jwt";
import { env } from "cloudflare:workers";
import { serialize } from "hono/utils/cookie";

import { getDatabase } from "../db/client";
import {
  accounts,
  jwks,
  oauthAccessTokens,
  oauthClientAssertions,
  oauthClientResources,
  oauthClients,
  oauthConsents,
  oauthRefreshTokens,
  oauthResources,
  sessions,
  users,
  verifications,
} from "../db/schema";
import { findInvite } from "../household/household";
import { cleanUserUpdate, isAllowlisted, normalizeEmail, signUpName } from "./policy";

// The invite page passes its token through Google login as OAuth `additionalData`.
// Clients control that value, which is fine: the token itself is the invite.
async function getInviteToken() {
  const state: unknown = await getOAuthState();
  if (typeof state !== "object" || state === null || !("inviteToken" in state)) return null;
  return typeof state.inviteToken === "string" ? state.inviteToken : null;
}

async function assertCanSignUp(email: string) {
  if (isAllowlisted(email, env.AUTH_ALLOWED_EMAILS)) return;
  const inviteToken = await getInviteToken();
  if (inviteToken && (await findInvite(inviteToken))) return;
  throw new APIError("FORBIDDEN", {
    code: "NOT_INVITED",
    message: "This Google account has not been invited to Soba.",
  });
}

// MCP clients like Claude register themselves, send the member through Google login and the
// consent page, and call /mcp with the access token. See src/server/mcp.
function mcpPlugin() {
  return mcp({
    resource: mcpResource(),
    loginPage: "/",
    consentPage: "/oauth/consent",
    allowDynamicClientRegistration: true,
    allowUnauthenticatedClientRegistration: true,
    // Most MCP clients don't say what kind of app they are. Local ones, like Claude Code, return
    // to http://localhost, which only native apps may use.
    clientRegistrationDefaultApplicationType: "infer",
    // Only registration creates apps; members can't create or change them by hand.
    clientPrivileges: ({ action }) => action === "read" || action === "list",
  });
}

function createAuth() {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      // Signed session data in a short-lived cookie avoids a D1 read on most requests.
      cookieCache: { enabled: true, maxAge: 5 * 60, strategy: "compact" },
    },
    database: drizzleAdapter(getDatabase(), {
      provider: "sqlite",
      schema: {
        account: accounts,
        session: sessions,
        user: users,
        verification: verifications,
        jwks,
        oauthClient: oauthClients,
        oauthResource: oauthResources,
        oauthClientResource: oauthClientResources,
        oauthRefreshToken: oauthRefreshTokens,
        oauthAccessToken: oauthAccessTokens,
        oauthConsent: oauthConsents,
        oauthClientAssertion: oauthClientAssertions,
      },
    }),
    // The JWT plugin's session-to-JWT endpoint; MCP clients get tokens through OAuth instead.
    disabledPaths: ["/token"],
    plugins: [jwt(), mcpPlugin()],
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            await assertCanSignUp(user.email);
            return {
              data: {
                ...user,
                name: signUpName(user.name, user.email),
                email: normalizeEmail(user.email),
              },
            };
          },
        },
        // Users can rename themselves through Better Auth's update-user endpoint.
        update: {
          before: async (user) => {
            const result = cleanUserUpdate(user);
            if (!result.ok) throw new APIError("BAD_REQUEST", { message: result.error });
            return { data: result.data };
          },
        },
      },
    },
    onAPIError: { errorURL: `${env.BETTER_AUTH_URL}/` },
    socialProviders: {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    },
  });
}

/** The MCP endpoint's URL, which access tokens are issued for. */
export function mcpResource() {
  return `${env.BETTER_AUTH_URL}/mcp`;
}

let auth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  return (auth ??= createAuth());
}

type GetSessionOptions = {
  /** Receives refreshed or cleared cookies; omit when the response cannot deliver them. */
  onSetCookie?: (cookie: string) => void;
  /** Skip the cookie cache so revoked sessions are rejected immediately. */
  fresh?: boolean;
};

export async function getSession(headers: Headers, options: GetSessionOptions = {}) {
  const { onSetCookie, fresh = false } = options;
  const { response: session, headers: responseHeaders } = await getAuth().api.getSession({
    headers,
    returnHeaders: true,
    query: { disableRefresh: !onSetCookie, disableCookieCache: fresh },
  });
  for (const cookie of responseHeaders.getSetCookie()) onSetCookie?.(cookie);
  // Invalid signatures do not always produce Better Auth's own deletion header.
  if (!session && onSetCookie && getSessionCookie(headers)) {
    const { name, attributes } = getCookies({ baseURL: env.BETTER_AUTH_URL }).sessionToken;
    onSetCookie(
      serialize(name, "", {
        path: attributes.path,
        secure: attributes.secure,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 0,
      }),
    );
  }
  return session ? { user: session.user, sessionId: session.session.id } : null;
}

export function handleAuth(request: Request): Promise<Response> {
  return getAuth().handler(request);
}

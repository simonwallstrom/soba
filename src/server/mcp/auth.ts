import { createResourceServerChallenge } from "@better-auth/oauth-provider";
import { APIError } from "better-auth/api";
import { verifyJwsAccessToken } from "better-auth/oauth2";
import { createMiddleware } from "hono/factory";

import { getAuth, mcpResource } from "../auth/auth";
import { getMembership } from "../household/household";
import type { Membership } from "../household/household";
import { isConnected } from "./connections";

export type McpEnv = {
  Bindings: Env;
  Variables: { userId: string; membership: Membership };
};

// Caches the signing keys per isolate, under a stable object as verifyJwsAccessToken asks.
const jwksCacheKey = {};

// Checks the access token the OAuth flow gave an MCP client. The keys come straight from the
// auth instance rather than over HTTP. A missing or bad token gets the WWW-Authenticate
// challenge that tells the client where to log in.
export const requireMcpToken = createMiddleware<McpEnv>(async (c, next) => {
  const auth = getAuth();
  const resource = mcpResource();
  const [scheme, token] = c.req.header("authorization")?.split(" ") ?? [];

  let userId: string | undefined;
  let clientId: string | undefined;
  if (scheme?.toLowerCase() === "bearer" && token) {
    try {
      const payload = await verifyJwsAccessToken(token, {
        jwksFetch: () => auth.api.getJwks(),
        jwksCacheKey,
        verifyOptions: { issuer: (await auth.$context).baseURL, audience: resource },
      });
      // Tokens bound to a DPoP key need a proof this server doesn't check, so they're refused.
      if (!payload["cnf"] && typeof payload["azp"] === "string") {
        userId = payload.sub;
        clientId = payload["azp"];
      }
    } catch {
      // Expired, revoked keys, or not ours: all get the challenge below.
    }
  }
  // A revoked app's token stays valid until it expires, so its consent must still be here.
  if (userId && clientId && !(await isConnected(userId, clientId))) userId = undefined;
  if (!userId) {
    const challenge = createResourceServerChallenge(
      new APIError("UNAUTHORIZED", { message: "Log in to Soba to continue" }),
      resource,
    );
    const headers = new Headers(challenge?.headers);
    return c.json(rpcError("Log in to Soba to continue"), 401, {
      "WWW-Authenticate": headers.get("WWW-Authenticate") ?? "Bearer",
    });
  }

  const membership = await getMembership(userId);
  if (!membership) return c.json(rpcError("Create or join a household in Soba first"), 403);
  c.set("userId", userId);
  c.set("membership", membership);
  return next();
});

function rpcError(message: string) {
  return { jsonrpc: "2.0", error: { code: -32000, message }, id: null };
}

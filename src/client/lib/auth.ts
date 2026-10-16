import { resetLocalData } from "@client/lib/local-data";
import { clearSession } from "@client/lib/session";
import type { createAuthClient } from "better-auth/client";

// Loaded on first use so the auth client stays out of the startup bundle.
let authClientPromise: Promise<ReturnType<typeof createAuthClient>> | undefined;

function getAuthClient() {
  return (authClientPromise ??= Promise.all([
    import("better-auth/client"),
    import("@better-auth/oauth-provider/client"),
  ]).then(
    // The OAuth plugin passes an MCP client's signed request, in the URL of the start page, through
    // Google login, so the server continues it to the consent page afterwards.
    ([{ createAuthClient }, { oauthProviderClient }]) =>
      createAuthClient({ plugins: [oauthProviderClient()] }),
    (error: unknown) => {
      // Lets the next attempt retry after a failed download, such as when offline.
      authClientPromise = undefined;
      throw error;
    },
  ));
}

export async function signInGoogle(options: {
  callbackURL: string;
  errorCallbackURL: string;
  /** Lets a new account sign up without being on the allowlist. */
  inviteToken?: string;
}) {
  const { inviteToken, ...urls } = options;
  const authClient = await getAuthClient();
  const result = await authClient.signIn.social({
    provider: "google",
    ...urls,
    ...(inviteToken ? { additionalData: { inviteToken } } : {}),
  });
  if (result.error) throw new Error(result.error.message ?? "Could not log in");
}

/** Maps the `error` search param from Better Auth's OAuth error redirect to a message. */
export function signInErrorMessage(code: string) {
  return code === "NOT_INVITED"
    ? "This Google account hasn’t been invited to Soba. Ask your family for an invite link."
    : "Could not log in. Please try again.";
}

export async function signOut() {
  const authClient = await getAuthClient();
  const result = await authClient.signOut();
  if (result.error) throw new Error(result.error.message ?? "Could not log out");
  await resetLocalData();
  await clearSession();
  window.location.replace("/");
}

export async function updateUserName(name: string) {
  const authClient = await getAuthClient();
  const result = await authClient.updateUser({ name });
  if (result.error) throw new Error(result.error.message ?? "Could not save your name");
}

/** An app asking for access to the household, such as Claude, by its self-chosen name. */
export async function getOAuthClientName(clientId: string) {
  const response = await fetch(
    `/api/auth/oauth2/public-client?${new URLSearchParams({ client_id: clientId })}`,
  );
  if (!response.ok) return null;
  const client: unknown = await response.json();
  return typeof client === "object" && client !== null && "client_name" in client
    ? String(client.client_name)
    : null;
}

/**
 * Answers the consent page, whose URL holds the request signed by the server, and returns the
 * app's URL to go back to.
 */
export async function answerOAuthConsent(accept: boolean) {
  const response = await fetch("/api/auth/oauth2/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accept, oauth_query: window.location.search.slice(1) }),
  });
  const result: unknown = await response.json().catch(() => null);
  if (response.ok && typeof result === "object" && result !== null && "url" in result) {
    return String(result.url);
  }
  throw new Error("This request has expired. Go back to the app and connect again.");
}

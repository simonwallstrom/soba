import { resetLocalData } from "@client/lib/local-data";
import { clearSession } from "@client/lib/session";
import type { createAuthClient } from "better-auth/client";

// Loaded on first use so the auth client stays out of the startup bundle.
let authClientPromise: Promise<ReturnType<typeof createAuthClient>> | undefined;

function getAuthClient() {
  return (authClientPromise ??= import("better-auth/client").then(
    ({ createAuthClient }) => createAuthClient(),
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

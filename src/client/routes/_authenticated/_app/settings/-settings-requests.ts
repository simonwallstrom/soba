import { toast } from "@client/components/ui/toast";
import { householdOptions } from "@client/features/household/members";
import { updateUserName } from "@client/lib/auth";
import { queryClient } from "@client/lib/query";
import { invalidateSession, sessionOptions } from "@client/lib/session";
import type { Session } from "@client/lib/session";

type ApiResponse = { ok: boolean; json(): Promise<unknown> };
type Household = NonNullable<Session["household"]>;

async function readError(response: ApiResponse) {
  try {
    const body = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      if (typeof body.error === "string") return body.error;
    }
  } catch {
    // Fall through to the generic message.
  }
  return "Something went wrong. Please try again.";
}

/** Sends a household request and shows a toast when it fails. Resolves to whether it worked. */
export async function sendHouseholdRequest(send: () => Promise<ApiResponse>) {
  try {
    const response = await send();
    if (response.ok) return true;
    toast.add({ title: await readError(response) });
  } catch {
    toast.add({ title: "Could not reach Soba. Check your connection and try again." });
  }
  return false;
}

/**
 * Shows a change to the household's name or settings at once, then saves it. The session is
 * fetched again either way, which keeps the change or puts back what the server has.
 */
export async function updateHousehold(
  change: Partial<Pick<Household, "name" | "language" | "units">>,
  send: () => Promise<ApiResponse>,
) {
  queryClient.setQueryData(sessionOptions.queryKey, (session): Session | undefined =>
    session?.user && session.household
      ? { ...session, household: { ...session.household, ...change } }
      : session,
  );
  await sendHouseholdRequest(send);
  await invalidateSession();
}

/** Shows the new name at once, then saves it. Members are refetched for their recipe bylines. */
export async function renameUser(name: string) {
  queryClient.setQueryData(sessionOptions.queryKey, (session): Session | undefined =>
    session?.user ? { ...session, user: { ...session.user, name } } : session,
  );
  try {
    await updateUserName(name);
  } catch (error) {
    toast.add({
      title: error instanceof Error ? error.message : "Could not save your name. Please try again.",
    });
  }
  await Promise.all([
    invalidateSession(),
    queryClient.invalidateQueries({ queryKey: householdOptions.queryKey }),
  ]);
}

import { toast } from "@client/components/ui/toast";
import { householdOptions } from "@client/features/household/members";
import { updateUserName } from "@client/lib/auth";
import { queryClient } from "@client/lib/query";
import { sendRequest } from "@client/lib/send-request";
import type { ApiResponse } from "@client/lib/send-request";
import { invalidateSession, sessionOptions } from "@client/lib/session";
import type { Session } from "@client/lib/session";

type Household = NonNullable<Session["household"]>;

/**
 * Shows a change to the household's name or settings at once, then saves it. The session is
 * fetched again either way, which keeps the change or puts back what the server has.
 */
export async function updateHousehold(
  change: Partial<Pick<Household, "name" | "language" | "units" | "timeZone">>,
  send: () => Promise<ApiResponse>,
) {
  queryClient.setQueryData(sessionOptions.queryKey, (session): Session | undefined =>
    session?.user && session.household
      ? { ...session, household: { ...session.household, ...change } }
      : session,
  );
  await sendRequest(send);
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

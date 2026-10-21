import { api } from "@client/lib/api";
import { queryClient } from "@client/lib/query";
import { sendRequest } from "@client/lib/send-request";
import { queryOptions } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

export type AdminUser = InferResponseType<typeof api.admin.users.$get, 200>["users"][number];
export type BetaAccess = InferResponseType<typeof api.admin.beta.$get, 200>["access"][number];

export const usersOptions = queryOptions({
  queryKey: ["admin", "users"],
  queryFn: async ({ signal }) => {
    const response = await api.admin.users.$get({}, { init: { signal } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return (await response.json()).users;
  },
});

export const betaOptions = queryOptions({
  queryKey: ["admin", "beta"],
  queryFn: async ({ signal }) => {
    const response = await api.admin.beta.$get({}, { init: { signal } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return (await response.json()).access;
  },
});

// Shows a change to the list at once, then saves it. The list is fetched again either way, which
// keeps the change or puts back what the server has.
async function changeBeta(
  change: (access: BetaAccess[]) => BetaAccess[],
  send: Parameters<typeof sendRequest>[0],
) {
  await queryClient.cancelQueries({ queryKey: betaOptions.queryKey });
  queryClient.setQueryData(betaOptions.queryKey, (access) => access && change(access));
  await sendRequest(send);
  await queryClient.invalidateQueries({ queryKey: betaOptions.queryKey });
}

export async function addToBeta(email: string, addedByName: string) {
  const normalized = email.trim().toLowerCase();
  await changeBeta(
    (access) =>
      access.some((entry) => entry.email === normalized)
        ? access
        : [
            ...access,
            {
              email: normalized,
              admin: false,
              addedByName,
              addedAt: new Date().toISOString(),
              signedUpAt: null,
            },
          ],
    () => api.admin.beta.$post({ json: { email: normalized } }),
  );
}

export async function removeFromBeta(email: string) {
  await changeBeta(
    (access) => access.filter((entry) => entry.email !== email),
    () => api.admin.beta[":email"].$delete({ param: { email } }),
  );
}

const relativeDays = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/** A recent day, like "today" or "3 days ago", or a date once it's a month back. */
export function formatDay(iso: string, now = new Date()) {
  const then = new Date(iso);
  const days = Math.round(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(then).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (days < 30) return relativeDays.format(-Math.max(days, 0), "day");
  return dateFormat.format(then);
}

/** Whether a user was active in the last week. */
export function isActiveThisWeek(user: AdminUser, now = Date.now()) {
  return user.lastActiveAt !== null && now - Date.parse(user.lastActiveAt) < 7 * 86_400_000;
}

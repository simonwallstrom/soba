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

// Most recently active first; those never seen after signing up go last.
function byActivity(a: { lastActiveAt: string | null }, b: { lastActiveAt: string | null }) {
  return (b.lastActiveAt ?? "").localeCompare(a.lastActiveAt ?? "");
}

export function sortUsers(users: readonly AdminUser[]) {
  return users.toSorted(byActivity);
}

export type AdminHousehold = Omit<NonNullable<AdminUser["household"]>, "role" | "checklist"> & {
  ownerName: string | null;
  // When its most recently active member was last seen.
  lastActiveAt: string | null;
};

/** Each household once, from its members' rows, most recently active first. */
export function listHouseholds(users: readonly AdminUser[]): AdminHousehold[] {
  const households = new Map<string, AdminHousehold>();
  for (const user of users.toSorted(byActivity)) {
    if (!user.household) continue;
    const { role, checklist: _, ...household } = user.household;
    const entry = households.get(household.id) ?? {
      ...household,
      ownerName: null,
      lastActiveAt: user.lastActiveAt,
    };
    if (role === "owner") entry.ownerName = user.name;
    households.set(household.id, entry);
  }
  return [...households.values()];
}

/** Whether a user was active in the last week. */
export function isActiveThisWeek(user: AdminUser, now = Date.now()) {
  return user.lastActiveAt !== null && now - Date.parse(user.lastActiveAt) < 7 * 86_400_000;
}

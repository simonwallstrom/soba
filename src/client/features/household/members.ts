import { currentOwner } from "@client/features/household/data";
import { api } from "@client/lib/api";
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import * as v from "valibot";

export type HouseholdMember = InferResponseType<typeof api.household.$get, 200>["members"][number];

// The members as last fetched, kept in this browser so a reload shows who added each recipe at
// once, like the recipes themselves. The invite link is never stored.
const storageKey = "soba-members";
const storedMembers = v.object({
  owner: v.string(),
  members: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      email: v.string(),
      image: v.nullable(v.string()),
      role: v.picklist(["owner", "member"]),
    }),
  ),
});

function readStoredMembers(): HouseholdMember[] | undefined {
  try {
    const stored = localStorage.getItem(storageKey);
    const result = v.safeParse(storedMembers, stored && JSON.parse(stored));
    return result.success && result.output.owner === currentOwner()
      ? result.output.members
      : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredMembers(members: HouseholdMember[]) {
  try {
    const owner = currentOwner();
    if (owner) localStorage.setItem(storageKey, JSON.stringify({ owner, members }));
  } catch {
    // Storage is full or unavailable: the next visit waits for its fetch.
  }
}

export const householdOptions = queryOptions({
  queryKey: ["household"],
  queryFn: async ({ signal }) => {
    const response = await api.household.$get({}, { init: { signal } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const household = await response.json();
    writeStoredMembers(household.members);
    return household;
  },
  // Keeps the loader's prefetch fresh when the page mounts after the recipes load.
  staleTime: 30_000,
});

// Members by user ID, for showing who added a recipe. Until the members load, the stored copy
// from the last visit stands in; on a first visit it is undefined.
export function useMembersById() {
  const { data } = useQuery({
    ...householdOptions,
    placeholderData: () => {
      const members = readStoredMembers();
      return members && { members, inviteUrl: null };
    },
    select: (household) => new Map(household.members.map((member) => [member.id, member])),
  });
  return data;
}

export function getInitials(name: string) {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

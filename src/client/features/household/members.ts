import { api } from "@client/lib/api";
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

export type HouseholdMember = InferResponseType<typeof api.household.$get, 200>["members"][number];

export const householdOptions = queryOptions({
  queryKey: ["household"],
  queryFn: async ({ signal }) => {
    const response = await api.household.$get({}, { init: { signal } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return response.json();
  },
  // Keeps the loader's prefetch fresh when the page mounts after the household store opens.
  staleTime: 30_000,
});

// Members by user ID, for showing who added a recipe. Empty until the members load.
export function useMembersById() {
  const { data } = useQuery({
    ...householdOptions,
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

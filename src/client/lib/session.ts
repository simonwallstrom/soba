import { api } from "@client/lib/api";
import { queryClient } from "@client/lib/query";
import { queryOptions } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import * as v from "valibot";

export type Session = InferResponseType<typeof api.me.$get>;

export const SIGNED_OUT: Session = { user: null, household: null, canCreateHousehold: false };

// The last signed-in session lets the app render before the server check finishes, and offline.
const SNAPSHOT_KEY = "soba-session";

const snapshotSchema = v.object({
  user: v.object({ id: v.string(), name: v.string(), email: v.string() }),
  household: v.nullable(
    v.object({ id: v.string(), name: v.string(), role: v.picklist(["owner", "member"]) }),
  ),
  canCreateHousehold: v.boolean(),
});

function readSnapshot(): Session | null {
  try {
    const stored = localStorage.getItem(SNAPSHOT_KEY);
    if (!stored) return null;
    const result = v.safeParse(snapshotSchema, JSON.parse(stored));
    return result.success ? result.output : null;
  } catch {
    return null;
  }
}

function writeSnapshot(session: Session) {
  try {
    if (session.user) localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(session));
    else localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // Storage can be unavailable in private browsing; the server check still works.
  }
}

export const sessionOptions = queryOptions({
  queryKey: ["session"],
  queryFn: async ({ signal }): Promise<Session> => {
    const response = await api.me.$get({}, { init: { signal, cache: "no-store" } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const session = await response.json();
    writeSnapshot(session);
    return session;
  },
  staleTime: 60_000,
  gcTime: Infinity,
  retry: false,
  networkMode: "always",
  refetchInterval: 5 * 60_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: "always",
});

const snapshot = readSnapshot();
// Marked stale so the first read returns it immediately and revalidates in the background.
if (snapshot) queryClient.setQueryData(sessionOptions.queryKey, snapshot, { updatedAt: 0 });

export function getSession() {
  return queryClient.ensureQueryData({ ...sessionOptions, revalidateIfStale: true });
}

/** Skips the cached session, for decisions that must reflect the server right now. */
export function fetchFreshSession() {
  return queryClient.fetchQuery({ ...sessionOptions, staleTime: 0 });
}

export async function invalidateSession() {
  await queryClient.cancelQueries({ queryKey: sessionOptions.queryKey });
  await queryClient.invalidateQueries({ queryKey: sessionOptions.queryKey, refetchType: "all" });
  broadcastSessionChange("changed");
}

export async function clearSession() {
  await queryClient.cancelQueries({ queryKey: sessionOptions.queryKey });
  queryClient.setQueryData(sessionOptions.queryKey, SIGNED_OUT);
  writeSnapshot(SIGNED_OUT);
  broadcastSessionChange("signed-out");
}

function broadcastSessionChange(message: "changed" | "signed-out") {
  const channel = new BroadcastChannel("soba-session");
  // BroadcastChannel is same-origin and has no targetOrigin argument.
  // oxlint-disable-next-line unicorn/require-post-message-target-origin
  channel.postMessage(message);
  channel.close();
}

export function watchSessionChanges(onSignOut: () => Promise<void>) {
  const channel = new BroadcastChannel("soba-session");
  channel.addEventListener("message", async (event: MessageEvent<unknown>) => {
    if (event.data !== "changed" && event.data !== "signed-out") return;
    await queryClient.cancelQueries({ queryKey: sessionOptions.queryKey });
    if (event.data === "signed-out") {
      queryClient.setQueryData(sessionOptions.queryKey, SIGNED_OUT);
      await onSignOut();
    } else {
      await queryClient.invalidateQueries({
        queryKey: sessionOptions.queryKey,
        refetchType: "active",
      });
    }
  });
  return () => channel.close();
}

import { toast } from "@client/components/ui/toast";
import { queryClient } from "@client/lib/query";
import { sessionOptions } from "@client/lib/session";
import { hashKey, queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import * as v from "valibot";

// A change the app shows before the server has it. `savedAt` is set once the server does.
type Change<TData> = { update: (data: TData) => TData; savedAt: number | null };

// Orders saves and fetches, to tell whether a fetch began after a change was saved.
let clock = 0;

// Changes reach the server one at a time, in the order they were made, so a quick undo never
// overtakes the change it takes back.
let writes: Promise<unknown> = Promise.resolve();

// Whose data a stored copy is: the member's favorites and their household's recipes.
function currentOwner() {
  const session = queryClient.getQueryData(sessionOptions.queryKey);
  return session?.user && session.household ? `${session.user.id}:${session.household.id}` : null;
}

/**
 * Household data the app reads from one cached fetch and changes without waiting: a change
 * shows at once, on top of the server's copy, until a fetch brings it back from the server.
 * A change that fails to save just goes away, with a toast.
 *
 * The server's last copy is also kept in this browser, so the app opens with it and fetches
 * behind it. `schema` reads that copy back, and drops one saved in an older shape. See
 * docs/data.md.
 */
export function createHouseholdData<TData>({
  queryKey,
  storageKey,
  schema,
  fetchData,
}: {
  queryKey: readonly string[];
  storageKey: string;
  schema: v.GenericSchema<unknown, TData>;
  fetchData: (signal: AbortSignal) => Promise<TData>;
}) {
  const options = queryOptions({
    queryKey,
    queryFn: ({ signal }) => fetchData(signal),
    // Other members' changes show up when the app regains focus, or on the next visit.
    staleTime: 30_000,
    gcTime: Infinity,
    // With nothing to show yet, say so soon rather than after three tries.
    retry: 1,
  });
  const queryHash = hashKey(queryKey);

  function readStored() {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return undefined;
      const result = v.safeParse(v.object({ owner: v.string(), data: schema }), JSON.parse(stored));
      return result.success && result.output.owner === currentOwner()
        ? result.output.data
        : undefined;
    } catch {
      return undefined;
    }
  }

  function writeStored(data: TData) {
    try {
      const owner = currentOwner();
      if (owner) localStorage.setItem(storageKey, JSON.stringify({ owner, data }));
    } catch {
      // Storage is full or unavailable: the next visit just waits for its fetch.
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Unavailable.
      }
    }
  }

  // Marked stale, so the first page to read it shows it at once and fetches behind it.
  const stored = readStored();
  if (stored !== undefined) queryClient.setQueryData(options.queryKey, stored, { updatedAt: 0 });
  let changes: readonly Change<TData>[] = [];
  let fetchStartedAt = 0;
  const listeners = new Set<() => void>();

  function setChanges(next: readonly Change<TData>[]) {
    changes = next;
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function withChanges(data: TData, pending: readonly Change<TData>[]) {
    return pending.reduce((current, change) => change.update(current), data);
  }

  // A fetch that began after a change was saved includes it, so the change can go.
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.query.queryHash !== queryHash) return;
    if (event.action.type === "fetch") {
      fetchStartedAt = ++clock;
    } else if (event.action.type === "success" && !event.action.manual) {
      writeStored(event.action.data);
      const kept = changes.filter(
        (change) => change.savedAt === null || change.savedAt > fetchStartedAt,
      );
      if (kept.length < changes.length) setChanges(kept);
    }
  });

  function refetch() {
    return queryClient.invalidateQueries({ queryKey });
  }

  return {
    options,
    refetch,

    /** The data with unsaved changes applied. Suspends until it first loads. */
    useData(): TData {
      const { data } = useSuspenseQuery(options);
      const pending = useSyncExternalStore(subscribe, () => changes);
      return withChanges(data, pending);
    },

    /** The same, for code outside components. Undefined until the data first loads. */
    read(): TData | undefined {
      const data = queryClient.getQueryData(options.queryKey);
      return data === undefined ? undefined : withChanges(data, changes);
    },

    /**
     * Shows a change right away and sends it. Resolves to whether it was saved. A fetch may
     * bring the change back while it still shows, so `update` must give the same result when
     * the data already includes it: set values rather than toggling or appending.
     */
    async save(update: (data: TData) => TData, send: () => Promise<Response>) {
      const change: Change<TData> = { update, savedAt: null };
      setChanges([...changes, change]);
      const sent = writes.then(async () => {
        const response = await send();
        if (!response.ok) throw new Error(`API returned ${response.status}`);
      });
      writes = sent.catch(() => {});
      try {
        await sent;
        change.savedAt = ++clock;
        return true;
      } catch {
        setChanges(changes.filter((other) => other !== change));
        toast.add({
          title: "Couldn’t save your change",
          description: "Check your connection and try again.",
        });
        return false;
      } finally {
        // Once nothing is on its way, the server's copy replaces the app's.
        if (changes.every((other) => other.savedAt !== null)) void refetch();
      }
    },
  };
}

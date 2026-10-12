import { toast } from "@client/components/ui/toast";
import { queryClient } from "@client/lib/query";
import { hashKey, queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

// A change the app shows before the server has it. `savedAt` is set once the server does.
type Change<TData> = { update: (data: TData) => TData; savedAt: number | null };

// Orders saves and fetches, to tell whether a fetch began after a change was saved.
let clock = 0;

// Changes reach the server one at a time, in the order they were made, so a quick undo never
// overtakes the change it takes back.
let writes: Promise<unknown> = Promise.resolve();

/**
 * Household data the app reads from one cached fetch and changes without waiting: a change
 * shows at once, on top of the server's copy, until a fetch brings it back from the server.
 * A change that fails to save just goes away, with a toast. See docs/data.md.
 */
export function createHouseholdData<TData>(
  queryKey: readonly string[],
  fetchData: (signal: AbortSignal) => Promise<TData>,
) {
  const options = queryOptions({
    queryKey,
    queryFn: ({ signal }) => fetchData(signal),
    // Other members' changes show up when the app regains focus, or on the next visit.
    staleTime: 30_000,
    gcTime: Infinity,
  });
  const queryHash = hashKey(queryKey);
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

    /** Calls the listener whenever the data or its unsaved changes may have changed. */
    subscribe(listener: () => void) {
      const unsubscribeChanges = subscribe(listener);
      const unsubscribeCache = queryClient.getQueryCache().subscribe((event) => {
        if (event.type === "updated" && event.query.queryHash === queryHash) listener();
      });
      return () => {
        unsubscribeChanges();
        unsubscribeCache();
      };
    },

    /** Resolves once the changes made so far have reached the server, or failed to. */
    whenSaved() {
      return writes.then(() => {});
    },

    /** Puts something the server just returned into the cached copy. */
    set(update: (data: TData) => TData) {
      queryClient.setQueryData(options.queryKey, (data) =>
        data === undefined ? undefined : update(data),
      );
    },
  };
}

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import type { Session } from "@client/lib/session";

let requestCount = 0;
let respond: (signal: AbortSignal | undefined) => Promise<Response>;
await mock.module(new URL("./api.ts", import.meta.url).pathname, () => ({
  api: {
    me: {
      $get: (_args: unknown, options: { init: { signal?: AbortSignal } }) => {
        requestCount++;
        return respond(options.init.signal);
      },
    },
  },
}));
const { queryClient } = await import("@client/lib/query");
const { clearSession, getSession, invalidateSession, sessionOptions, watchSessionChanges } =
  await import("@client/lib/session");
const signedIn: Session = {
  user: { id: "user-1", name: "Test", email: "test@example.com" },
  household: { id: "household-1", name: "Test household", role: "owner" },
  canCreateHousehold: false,
};

beforeEach(() => {
  queryClient.clear();
  requestCount = 0;
  respond = async () => Response.json(signedIn);
});
afterEach(() => queryClient.clear());

describe("session lifecycle", () => {
  test("initial checks are deduplicated and warm navigation makes no request", async () => {
    const [first, second] = await Promise.all([getSession(), getSession()]);
    expect(first).toEqual(signedIn);
    expect(second).toEqual(signedIn);
    await getSession();
    expect(requestCount).toBe(1);
  });

  test("stale data returns immediately while the server check is pending", async () => {
    await getSession();
    queryClient.setQueryData(sessionOptions.queryKey, signedIn, { updatedAt: Date.now() - 61_000 });
    let release: ((value: Response) => void) | undefined;
    respond = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    expect(await getSession()).toEqual(signedIn);
    expect(requestCount).toBe(2);
    release?.(Response.json(signedIn));
    await queryClient.fetchQuery(sessionOptions);
  });

  test("failed initial checks can be retried", async () => {
    respond = async () => new Response("Unavailable", { status: 503 });
    expect(getSession()).rejects.toThrow("503");
    respond = async () => Response.json(signedIn);
    expect(await getSession()).toEqual(signedIn);
  });

  test("offline background errors preserve the known session", async () => {
    await getSession();
    queryClient.setQueryData(sessionOptions.queryKey, signedIn, { updatedAt: Date.now() - 61_000 });
    respond = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await getSession()).toEqual(signedIn);
    expect(queryClient.fetchQuery(sessionOptions)).rejects.toThrow("Failed to fetch");
    expect(queryClient.getQueryData<Session>(sessionOptions.queryKey)).toEqual(signedIn);
  });

  test("household changes explicitly refresh the cached context", async () => {
    await getSession();
    respond = async () =>
      Response.json({
        ...signedIn,
        household: { ...signedIn.household, name: "New household name" },
      });
    await invalidateSession();
    expect((await getSession()).household?.name).toBe("New household name");
    expect(requestCount).toBe(2);
  });

  test("unchanged refreshes keep object identity for route context comparison", async () => {
    const first = await getSession();
    await queryClient.fetchQuery({ ...sessionOptions, staleTime: 0 });
    // Components read the cached copy, which structural sharing keeps when nothing changed.
    const second = queryClient.getQueryData(sessionOptions.queryKey);
    expect(requestCount).toBe(2);
    expect(second?.user).toBe(first.user);
    expect(second?.household).toBe(first.household);
  });

  test("sign-out cancels an in-flight refresh so it cannot restore old auth", async () => {
    await getSession();
    queryClient.setQueryData(sessionOptions.queryKey, signedIn, { updatedAt: Date.now() - 61_000 });
    respond = (signal) =>
      new Promise((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    await getSession();
    await clearSession();
    expect(queryClient.getQueryData<Session>(sessionOptions.queryKey)).toEqual({
      user: null,
      household: null,
      canCreateHousehold: false,
    });
  });

  test("sign-out broadcasts to other tabs and invokes their cleanup", async () => {
    await getSession();
    let closed = false;
    const stop = watchSessionChanges(async () => {
      closed = true;
    });
    try {
      await clearSession();
      for (let attempt = 0; attempt < 30; attempt++) {
        if (closed) break;
        await Bun.sleep(5);
      }
      expect(closed).toBe(true);
    } finally {
      stop();
    }
  });
});

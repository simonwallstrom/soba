import { afterEach, describe, expect, mock, test } from "bun:test";

import type { Session } from "@client/lib/session";

// Bun has no localStorage; install one before the session module reads its snapshot.
const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});

const cached: Session = {
  user: { id: "user-1", name: "Test", email: "test@example.com", image: null },
  household: { id: "household-1", name: "Test household", role: "owner" },
  canCreateHousehold: false,
};
storage.set("soba-session", JSON.stringify(cached));

let requestCount = 0;
let respond: () => Promise<Response>;
await mock.module(new URL("./api.ts", import.meta.url).pathname, () => ({
  api: {
    me: {
      $get: () => {
        requestCount++;
        return respond();
      },
    },
  },
}));
const { queryClient } = await import("@client/lib/query");
const { clearSession, getSession, sessionOptions } = await import("@client/lib/session");

afterEach(() => storage.clear());

describe("cached session snapshot", () => {
  test("boots from the snapshot without waiting and revalidates in the background", async () => {
    let release: ((response: Response) => void) | undefined;
    // The server has not answered yet, like a slow or offline network.
    respond = () => new Promise((resolve) => (release = resolve));
    expect(await getSession()).toEqual(cached);
    expect(requestCount).toBe(1);
    release?.(Response.json(cached));
    await queryClient.fetchQuery(sessionOptions);
  });

  test("a fresh server session replaces the snapshot", async () => {
    const renamed = { ...cached, household: { ...cached.household, name: "Renamed" } };
    respond = async () => Response.json(renamed);
    await queryClient.fetchQuery({ ...sessionOptions, staleTime: 0 });
    expect(JSON.parse(storage.get("soba-session") ?? "null")).toEqual(renamed);
  });

  test("signing out removes the snapshot", async () => {
    storage.set("soba-session", JSON.stringify(cached));
    await clearSession();
    expect(storage.has("soba-session")).toBe(false);
  });
});

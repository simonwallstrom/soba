import { describe, expect, mock, test } from "bun:test";

await mock.module(new URL("./store-access.ts", import.meta.url).pathname, () => ({
  assertStoreAccess: async (_storeId: string, cookie: string | undefined) => {
    if (cookie !== "valid") throw new Error("Unauthorized");
  },
}));
const { closeUnauthorizedConnections } = await import("./sync-connections");

function socket(attachment: unknown, readyState: number = WebSocket.OPEN) {
  let closeCode: number | undefined;
  return {
    readyState,
    deserializeAttachment: () => attachment,
    close: (code: number) => {
      closeCode = code;
    },
    get closeCode() {
      return closeCode;
    },
  };
}

function syncSocket(cookie: string, readyState: number = WebSocket.OPEN) {
  // sync-cf stores its attachment as a JSON string.
  return socket(JSON.stringify({ storeId: "household-1", headers: { cookie } }), readyState);
}

async function check(...sockets: ReturnType<typeof socket>[]) {
  // The test double implements only the Cloudflare socket methods this helper uses.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  await closeUnauthorizedConnections(sockets as unknown as WebSocket[]);
}

describe("sync connection cleanup", () => {
  test("closes revoked connections and keeps authorized ones", async () => {
    const valid = syncSocket("valid");
    const revoked = syncSocket("revoked");
    await check(valid, revoked);
    expect(valid.closeCode).toBeUndefined();
    expect(revoked.closeCode).toBe(1008);
  });

  test("closes connections without stored authorization", async () => {
    const missing = socket(JSON.stringify({ storeId: "household-1", headers: {} }));
    await check(missing);
    expect(missing.closeCode).toBe(1008);
  });

  test("leaves sockets that are already closing alone", async () => {
    const closing = syncSocket("revoked", WebSocket.CLOSING);
    await check(closing);
    expect(closing.closeCode).toBeUndefined();
  });
});

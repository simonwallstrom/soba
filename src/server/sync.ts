import { makeDurableObject } from "@livestore/sync-cf/cf-worker";
import { DurableObject } from "cloudflare:workers";

import { closeUnauthorizedConnections } from "./auth/sync-connections";

type SyncBackend = {
  fetch: (request: Request) => Promise<Response>;
  webSocketMessage?: (socket: WebSocket, message: string | ArrayBuffer) => void | Promise<void>;
  webSocketClose?: (
    socket: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ) => void | Promise<void>;
  webSocketError?: (socket: WebSocket, error: unknown) => void | Promise<void>;
};

// sync-cf's Cloudflare types predate Wrangler's types; bridge only this integration boundary.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const createBackend = makeDurableObject as unknown as (
  options: Parameters<typeof makeDurableObject>[0],
) => new (ctx: DurableObjectState, env: Env) => SyncBackend;

// A removed member may keep receiving updates until the next check.
const ACCESS_CHECK_INTERVAL_MS = 15 * 60_000;

export class SyncBackendDO extends DurableObject<Env> {
  private backend: SyncBackend;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    const Backend = createBackend({
      enabledTransports: new Set(["ws"]),
      storage: { _tag: "do-sqlite" },
      // Access is checked when the socket connects; the alarm re-checks the stored cookie.
      forwardHeaders: ["cookie"],
    });
    this.backend = new Backend(ctx, env);
  }

  override async fetch(request: Request) {
    const response = await this.backend.fetch(request);
    if (response.status === 101 && (await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now() + ACCESS_CHECK_INTERVAL_MS);
    }
    return response;
  }

  // Closes sockets whose session expired or whose user left the household.
  override async alarm() {
    await closeUnauthorizedConnections(this.ctx.getWebSockets());
    if (this.ctx.getWebSockets().some((socket) => socket.readyState === WebSocket.OPEN)) {
      await this.ctx.storage.setAlarm(Date.now() + ACCESS_CHECK_INTERVAL_MS);
    }
  }

  override webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    return this.backend.webSocketMessage?.(socket, message);
  }

  override webSocketClose(socket: WebSocket, code: number, reason: string, wasClean: boolean) {
    return this.backend.webSocketClose?.(socket, code, reason, wasClean);
  }

  override webSocketError(socket: WebSocket, error: unknown) {
    return this.backend.webSocketError?.(socket, error);
  }
}

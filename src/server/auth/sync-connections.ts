import { assertStoreAccess } from "./store-access";

export async function closeUnauthorizedConnections(sockets: WebSocket[]) {
  await Promise.all(
    sockets.map(async (socket) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      try {
        const encoded: unknown = socket.deserializeAttachment();
        // sync-cf encodes its attachment with Schema.parseJson, so Cloudflare stores a string.
        const attachment: unknown = typeof encoded === "string" ? JSON.parse(encoded) : encoded;
        if (
          typeof attachment !== "object" ||
          attachment === null ||
          !("storeId" in attachment) ||
          typeof attachment.storeId !== "string" ||
          !("headers" in attachment) ||
          typeof attachment.headers !== "object" ||
          attachment.headers === null ||
          !("cookie" in attachment.headers) ||
          typeof attachment.headers.cookie !== "string"
        )
          throw new Error("Missing sync authorization");
        await assertStoreAccess(attachment.storeId, attachment.headers.cookie);
      } catch {
        socket.close(1008, "Session expired or household access removed");
      }
    }),
  );
}

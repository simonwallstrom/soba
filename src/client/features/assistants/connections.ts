import { api } from "@client/lib/api";
import { queryOptions } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";

export type Connection = InferResponseType<typeof api.connections.$get, 200>["connections"][number];

// The member's own AI assistants, connected over MCP.
export const connectionsOptions = queryOptions({
  queryKey: ["connections"],
  queryFn: async ({ signal }) => {
    const response = await api.connections.$get({}, { init: { signal } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return (await response.json()).connections;
  },
});

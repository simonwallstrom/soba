import { toast } from "@client/components/ui/toast";

export type ApiResponse = { ok: boolean; json(): Promise<unknown> };

async function readError(response: ApiResponse) {
  try {
    const body = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      if (typeof body.error === "string") return body.error;
    }
  } catch {
    // Fall through to the generic message.
  }
  return "Something went wrong. Please try again.";
}

/** Sends an API request and shows a toast when it fails. Resolves to whether it worked. */
export async function sendRequest(send: () => Promise<ApiResponse>) {
  try {
    const response = await send();
    if (response.ok) return true;
    toast.add({ title: await readError(response) });
  } catch {
    toast.add({ title: "Could not reach Soba. Check your connection and try again." });
  }
  return false;
}

import { api } from "@client/lib/api";
import { formatMetaTitle } from "@client/lib/meta";
import { queryClient } from "@client/lib/query";
import { invalidateSession } from "@client/lib/session";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

const householdOptions = queryOptions({
  queryKey: ["household"],
  queryFn: async ({ signal }) => {
    const response = await api.household.$get({}, { init: { signal } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return response.json();
  },
  // Keeps the loader's prefetch fresh when the page mounts after the household store opens.
  staleTime: 30_000,
});

export const Route = createFileRoute("/_authenticated/_app/household")({
  // Starts the members request without blocking navigation.
  loader: () => {
    void queryClient.prefetchQuery(householdOptions);
  },
  staticData: { breadcrumbs: [{ label: "Household" }] },
  component: Household,
});

async function readError(response: { json(): Promise<unknown> }, fallback: string) {
  try {
    const body = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      if (typeof body.error === "string") return body.error;
    }
  } catch {
    // Fall through to the generic message.
  }
  return fallback;
}

function Household() {
  const { user, household } = Route.useRouteContext();
  const { data, isError } = useQuery(householdOptions);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOwner = household.role === "owner";
  const otherMembers = data?.members.filter((member) => member.id !== user.id) ?? [];

  async function run(action: () => Promise<{ ok: boolean; json(): Promise<unknown> }>) {
    setError("");
    setBusy(true);
    try {
      const response = await action();
      if (!response.ok) {
        setError(await readError(response, "Something went wrong. Please try again."));
        return false;
      }
      return true;
    } catch {
      setError("Could not reach Soba. Check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function resetLink() {
    const confirmed = window.confirm("Anyone with the old link will no longer be able to join.");
    if (!confirmed) return;
    if (await run(() => api.household.invite.reset.$post())) {
      await queryClient.invalidateQueries({ queryKey: householdOptions.queryKey });
    }
  }

  async function removeMember(member: { id: string; name: string }) {
    if (!window.confirm(`Remove ${member.name} from ${household.name}?`)) return;
    if (
      await run(() => api.household.members[":userId"].$delete({ param: { userId: member.id } }))
    ) {
      await queryClient.invalidateQueries({ queryKey: householdOptions.queryKey });
    }
  }

  async function leave() {
    const message = isOwner
      ? `Delete ${household.name}? All of its recipes will be removed.`
      : `Leave ${household.name}? Its recipes will be removed from this device.`;
    if (!window.confirm(message)) return;
    // The authenticated layout clears local data and redirects once the session changes.
    if (await run(() => api.household.leave.$post())) await invalidateSession();
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <>
      <title>{formatMetaTitle("Household")}</title>
      <div className="flex flex-col gap-8 p-5 lg:p-6">
        {error && <p role="alert">{error}</p>}

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Members</h2>
          {isError && <p role="alert">Could not load members. Check your connection.</p>}
          {!data && !isError && <p className="text-olive-500">Loading members…</p>}
          {data && (
            <ul className="flex flex-col gap-2">
              {data.members.map((member) => (
                <li key={member.id} className="flex items-center gap-3 border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {member.name}
                      {member.id === user.id && " (you)"}
                    </p>
                    <p className="text-sm break-words text-olive-500">{member.email}</p>
                  </div>
                  <p className="text-sm">{member.role === "owner" ? "Owner" : "Member"}</p>
                  {isOwner && member.role !== "owner" && (
                    <button
                      className="border px-3 py-1 text-sm"
                      disabled={busy}
                      onClick={() => void removeMember(member)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {isOwner && data?.inviteUrl && (
          <section className="flex flex-col gap-3">
            <h2 className="font-medium">Invite link</h2>
            <p>
              Anyone with this link can log in with Google and join {household.name}. Only share it
              with people you trust.
            </p>
            <p className="border p-2 text-sm break-all">{data.inviteUrl}</p>
            <div className="flex gap-3">
              <button
                className="border px-3 py-2"
                onClick={() => void copyLink(data.inviteUrl ?? "")}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
              <button className="border px-3 py-2" disabled={busy} onClick={() => void resetLink()}>
                Reset link
              </button>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="font-medium">{isOwner ? "Delete household" : "Leave household"}</h2>
          {isOwner && otherMembers.length > 0 ? (
            <p>Remove the other members before deleting this household.</p>
          ) : (
            <button
              className="self-start border px-3 py-2"
              disabled={busy || (isOwner && !data)}
              onClick={() => void leave()}
            >
              {isOwner ? "Delete household" : "Leave household"}
            </button>
          )}
        </section>
      </div>
    </>
  );
}

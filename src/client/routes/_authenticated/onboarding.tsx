import { api } from "@client/lib/api";
import { signOut } from "@client/lib/auth";
import { formatMetaTitle } from "@client/lib/meta";
import { invalidateSession } from "@client/lib/session";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import type { SubmitEvent } from "react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  beforeLoad: ({ context }) => {
    if (context.household) throw redirect({ to: "/recipes", replace: true });
  },
  component: Onboarding,
});

function Onboarding() {
  const { user, canCreateHousehold } = Route.useRouteContext();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function createHousehold(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreating(true);
    try {
      const response = await api.household.$post({ json: { name } });
      if (!response.ok) {
        const result = await response.json();
        setError("error" in result ? result.error : "Could not create household");
        setCreating(false);
        return;
      }
    } catch {
      setError("Could not reach Soba. Check your connection and try again.");
      setCreating(false);
      return;
    }
    await invalidateSession();
    await router.invalidate();
    await router.navigate({ to: "/recipes", replace: true });
  }

  async function logOut() {
    try {
      await signOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not log out");
    }
  }

  return (
    <>
      <title>{formatMetaTitle(canCreateHousehold ? "Create household" : "Join a household")}</title>
      <main className="mx-auto flex max-w-xl flex-col gap-4 p-8 pt-[calc(2rem+env(safe-area-inset-top))]">
        {canCreateHousehold ? (
          <>
            <h1 className="text-xl font-medium">Create your household</h1>
            <p>Give your household a name to start saving recipes together.</p>
            {error && <p role="alert">{error}</p>}
            <form onSubmit={createHousehold} className="flex flex-col gap-3">
              <label className="block">
                Household name
                <input
                  className="block w-full border p-2"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={80}
                  required
                />
              </label>
              <button type="submit" className="self-start border px-3 py-2" disabled={creating}>
                {creating ? "Creating…" : "Create household"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-xl font-medium">Join your household</h1>
            <p>
              You’re logged in as {user.email}. Ask someone in your household to share their invite
              link with you, then open it to join.
            </p>
            {error && <p role="alert">{error}</p>}
            <button className="self-start border px-3 py-2" onClick={() => void logOut()}>
              Log out
            </button>
          </>
        )}
      </main>
    </>
  );
}

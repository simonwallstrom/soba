import { api } from "@client/lib/api";
import { signInErrorMessage, signInGoogle } from "@client/lib/auth";
import { formatMetaTitle } from "@client/lib/meta";
import {
  fetchFreshSession,
  getSession,
  invalidateSession,
  sessionOptions,
} from "@client/lib/session";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import * as v from "valibot";

export const Route = createFileRoute("/_public/invite/$token")({
  validateSearch: v.object({ error: v.optional(v.string()), join: v.optional(v.boolean()) }),
  loaderDeps: ({ search }) => ({ join: search.join === true }),
  loader: async ({ params, deps }) => {
    // Always asks the server, so a reset link stops working immediately.
    const [response, session] = await Promise.all([
      api.invites[":token"].$get({ param: { token: params.token } }),
      deps.join ? fetchFreshSession() : getSession(),
    ]);
    if (response.status === 404) return { invite: null, joinError: null };
    // Rate limiting and server errors are not part of the typed response.
    if (!response.ok) throw new Error("Could not load this invite");
    const invite = await response.json();

    // Returning from "Login with Google to join" already confirmed the invite.
    if (deps.join && session.user && !session.household) {
      const joined = await api.invites[":token"].join.$post({ param: { token: params.token } });
      if (joined.ok) {
        await invalidateSession();
        throw redirect({ to: "/recipes", replace: true });
      }
      const result = await joined.json();
      return { invite, joinError: "error" in result ? result.error : "Could not join household" };
    }
    return { invite, joinError: null };
  },
  staleTime: 0,
  component: Invite,
});

function Invite() {
  const { token } = Route.useParams();
  const { error: callbackError } = Route.useSearch();
  const { invite, joinError } = Route.useLoaderData();
  const { data: session } = useSuspenseQuery(sessionOptions);
  const router = useRouter();
  const [error, setError] = useState(
    joinError ?? (callbackError ? signInErrorMessage(callbackError) : ""),
  );
  const [joining, setJoining] = useState(false);

  async function join() {
    setError("");
    setJoining(true);
    try {
      const response = await api.invites[":token"].join.$post({ param: { token } });
      if (!response.ok) {
        const result = await response.json();
        setError("error" in result ? result.error : "Could not join household");
        setJoining(false);
        return;
      }
    } catch {
      // Also covers server errors, whose bodies are not JSON.
      setError("Could not join household. Check your connection and try again.");
      setJoining(false);
      return;
    }
    await invalidateSession();
    await router.navigate({ to: "/recipes", replace: true });
  }

  async function logIn() {
    setError("");
    const invitePath = `/invite/${token}`;
    try {
      await signInGoogle({
        callbackURL: `${invitePath}?join=true`,
        errorCallbackURL: invitePath,
        inviteToken: token,
      });
    } catch (logInFailure) {
      setError(logInFailure instanceof Error ? logInFailure.message : "Could not log in");
    }
  }

  if (!invite) {
    return (
      <>
        <title>{formatMetaTitle("Invite link expired")}</title>
        <section className="flex flex-col gap-4">
          <h1 className="text-xl font-medium">This invite link no longer works</h1>
          <p>It may have been reset. Ask someone in the household for a new link.</p>
        </section>
      </>
    );
  }

  return (
    <>
      <title>{formatMetaTitle(`Join ${invite.householdName}`)}</title>
      <section className="flex flex-col gap-4">
        <h1 className="text-xl font-medium">Join {invite.householdName}</h1>
        <p>
          {invite.inviterName} invited you to share recipes with {invite.householdName} on Soba.
        </p>
        {error && <p role="alert">{error}</p>}
        {!session.user ? (
          <button className="self-start border px-3 py-2" onClick={() => void logIn()}>
            Login with Google to join
          </button>
        ) : session.household ? (
          <>
            <p>
              You’re logged in as {session.user.email} and already belong to{" "}
              {session.household.name}. Soba accounts can be in one household at a time.
            </p>
            <Link to="/recipes" className="self-start underline">
              Go to your recipes
            </Link>
          </>
        ) : (
          <>
            <p>You’ll join as {session.user.email}.</p>
            <button
              className="self-start border px-3 py-2"
              disabled={joining}
              onClick={() => void join()}
            >
              {joining ? "Joining…" : `Join ${invite.householdName}`}
            </button>
          </>
        )}
      </section>
    </>
  );
}

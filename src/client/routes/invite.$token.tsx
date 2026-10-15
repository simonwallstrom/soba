import { WelcomeHeader, WelcomeLayout } from "@client/components/particles/welcome-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@client/components/ui/avatar";
import { Button, buttonVariants } from "@client/components/ui/button";
import { GoogleIcon } from "@client/components/ui/icons";
import { getInitials } from "@client/features/household/members";
import { api } from "@client/lib/api";
import { signInErrorMessage, signInGoogle } from "@client/lib/auth";
import { formatMetaTitle } from "@client/lib/meta";
import {
  fetchFreshSession,
  getSession,
  invalidateSession,
  sessionOptions,
} from "@client/lib/session";
import { useSignOut } from "@client/lib/use-sign-out";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import * as v from "valibot";

export const Route = createFileRoute("/invite/$token")({
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

    // Returning from "Continue with Google" already confirmed the invite.
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

const linkStyles =
  "underline underline-offset-2 hover:text-olive-800 focus-visible:outline-2 dark:hover:text-olive-200";

function Invite() {
  const { token } = Route.useParams();
  const { error: callbackError } = Route.useSearch();
  const { invite, joinError } = Route.useLoaderData();
  const { data: session } = useSuspenseQuery(sessionOptions);
  const router = useRouter();
  const { logOut, signingOut, signOutError } = useSignOut();
  const [error, setError] = useState(
    joinError ?? (callbackError ? signInErrorMessage(callbackError) : ""),
  );
  const [busy, setBusy] = useState(false);

  async function join() {
    setError("");
    setBusy(true);
    try {
      const response = await api.invites[":token"].join.$post({ param: { token } });
      if (!response.ok) {
        const result = await response.json();
        setError("error" in result ? result.error : "Could not join household");
        setBusy(false);
        return;
      }
    } catch {
      // Also covers server errors, whose bodies are not JSON.
      setError("Could not join household. Check your connection and try again.");
      setBusy(false);
      return;
    }
    await invalidateSession();
    await router.navigate({ to: "/recipes", replace: true });
  }

  async function logIn() {
    setError("");
    setBusy(true);
    const invitePath = `/invite/${token}`;
    try {
      await signInGoogle({
        callbackURL: `${invitePath}?join=true`,
        errorCallbackURL: invitePath,
        inviteToken: token,
      });
    } catch (logInFailure) {
      setError(logInFailure instanceof Error ? logInFailure.message : "Could not log in");
      setBusy(false);
    }
  }

  if (!invite) {
    return (
      <>
        <title>{formatMetaTitle("Invite link expired")}</title>
        <WelcomeLayout>
          <WelcomeHeader
            description="It may have been reset. Ask someone in the household for a new link."
            title="This invite link no longer works"
          />
          <Link className={buttonVariants()} to="/">
            Go to Soba
          </Link>
        </WelcomeLayout>
      </>
    );
  }

  const shownError = error || signOutError;
  // Logged in with the wrong account, or one already in a household: a way to switch.
  const switchAccount = session.user && (
    <>
      Logged in as {session.user.email} ·{" "}
      <button
        className={linkStyles}
        disabled={signingOut}
        onClick={() => void logOut()}
        type="button"
      >
        {signingOut ? "Logging out…" : "Log out"}
      </button>
    </>
  );
  const terms = (
    <>
      By continuing, you agree to the{" "}
      <Link className={linkStyles} to="/terms">
        Terms of use
      </Link>{" "}
      and{" "}
      <Link className={linkStyles} to="/privacy">
        Privacy policy
      </Link>
      .
    </>
  );

  return (
    <>
      <title>{formatMetaTitle(`Join ${invite.householdName}`)}</title>
      <WelcomeLayout footer={switchAccount || terms}>
        <WelcomeHeader
          description={
            session.user && session.household
              ? `You’re already in ${session.household.name}. A Soba account can be in one household at a time.`
              : "Save recipes and plan meals together on Soba."
          }
          // Who sent it, where onboarding says which step it is, so a link from family is
          // recognizable at a glance.
          eyebrow={
            <>
              <Avatar className="size-5 text-[0.5rem]">
                {invite.inviterImage && (
                  <AvatarImage alt="" referrerPolicy="no-referrer" src={invite.inviterImage} />
                )}
                <AvatarFallback>{getInitials(invite.inviterName)}</AvatarFallback>
              </Avatar>
              {invite.inviterName} invited you
            </>
          }
          title={`Join ${invite.householdName}`}
        />
        {shownError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {shownError}
          </p>
        )}
        {!session.user ? (
          <Button className="mt-1" disabled={busy} onClick={() => void logIn()} variant="primary">
            <GoogleIcon className="-ml-0.5" />
            {busy ? "Logging in…" : "Continue with Google"}
          </Button>
        ) : session.household ? (
          <Link className={buttonVariants({ className: "mt-1", variant: "primary" })} to="/recipes">
            Go to your recipes
          </Link>
        ) : (
          <Button className="mt-1" disabled={busy} onClick={() => void join()} variant="primary">
            {busy ? "Joining…" : `Join ${invite.householdName}`}
          </Button>
        )}
      </WelcomeLayout>
    </>
  );
}

import { WelcomeHeader, WelcomeLayout } from "@client/components/particles/welcome-layout";
import { Button, buttonVariants } from "@client/components/ui/button";
import { answerOAuthConsent, getOAuthClientName } from "@client/lib/auth";
import { formatMetaTitle } from "@client/lib/meta";
import { getSession } from "@client/lib/session";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import * as v from "valibot";

// Where an MCP client like Claude sends a member, after Google login, to approve access to the
// household. Better Auth signs the query, and answering sends it back with it. See src/server/mcp.
export const Route = createFileRoute("/oauth/consent")({
  validateSearch: v.looseObject({ client_id: v.string(), redirect_uri: v.optional(v.string()) }),
  loaderDeps: ({ search }) => ({ clientId: search.client_id }),
  beforeLoad: async () => {
    const session = await getSession();
    if (!session.user) throw redirect({ to: "/", replace: true });
    return { user: session.user, household: session.household };
  },
  loader: async ({ deps }) => ({ clientName: await getOAuthClientName(deps.clientId) }),
  staleTime: Infinity,
  component: Consent,
});

function Consent() {
  const { redirect_uri: redirectUri } = Route.useSearch();
  const { user, household } = Route.useRouteContext();
  const { clientName } = Route.useLoaderData();
  const [error, setError] = useState("");
  const [answering, setAnswering] = useState<"allow" | "deny" | null>(null);

  // Any app can register under any name, so the place it returns to is what identifies it.
  const returnHost = redirectUri && URL.canParse(redirectUri) ? new URL(redirectUri).host : null;
  const appName = clientName ?? "An app";
  const footer = <>Logged in as {user.email}</>;

  async function answer(accept: boolean) {
    setError("");
    setAnswering(accept ? "allow" : "deny");
    try {
      window.location.assign(await answerOAuthConsent(accept));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not connect");
      setAnswering(null);
    }
  }

  if (!household) {
    return (
      <>
        <title>{formatMetaTitle("Connect an app")}</title>
        <WelcomeLayout footer={footer}>
          <WelcomeHeader
            description={`Create or join a household first, then connect ${appName} again.`}
            title="You’re not in a household yet"
          />
          <Link className={buttonVariants({ variant: "primary" })} to="/onboarding">
            Set up your household
          </Link>
        </WelcomeLayout>
      </>
    );
  }

  return (
    <>
      <title>{formatMetaTitle(`Connect ${appName}`)}</title>
      <WelcomeLayout footer={footer}>
        <WelcomeHeader
          description={
            <>
              {appName} will be able to read and change the recipes and meal plan in{" "}
              {household.name}, as you.
              {returnHost && <> You’ll go back to {returnHost} afterwards.</>}
            </>
          }
          eyebrow="Connect an app"
          title={`Allow ${appName} to use Soba?`}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        <div className="mt-1 flex flex-col gap-2">
          <Button disabled={answering !== null} onClick={() => void answer(true)} variant="primary">
            {answering === "allow" ? "Connecting…" : "Allow"}
          </Button>
          <Button disabled={answering !== null} onClick={() => void answer(false)}>
            {answering === "deny" ? "Cancelling…" : "Cancel"}
          </Button>
        </div>
      </WelcomeLayout>
    </>
  );
}

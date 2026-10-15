import { WelcomeHeader, WelcomeLayout } from "@client/components/particles/welcome-layout";
import { buttonVariants } from "@client/components/ui/button";
import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/request-access")({ component: RequestAccess });

// Until there's a way to ask, this explains how people get in today: through family.
function RequestAccess() {
  return (
    <>
      <title>{formatMetaTitle("Request access")}</title>
      <WelcomeLayout>
        <WelcomeHeader
          description="Soba is invite-only for now. If someone in your family already uses it, ask them for their household’s invite link. A way to request access is coming before launch."
          title="Request access"
        />
        <Link className={buttonVariants()} to="/">
          Back to start
        </Link>
      </WelcomeLayout>
    </>
  );
}

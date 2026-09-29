import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/request-access")({ component: RequestAccess });

function RequestAccess() {
  return (
    <>
      <title>{formatMetaTitle("Request access")}</title>
      <article className="max-w-xl space-y-2">
        <h1 className="text-xl font-medium">Request access</h1>
        <p>Soba is invite-only for now. A way to request access will be added before launch.</p>
      </article>
    </>
  );
}

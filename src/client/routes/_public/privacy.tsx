import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/privacy")({ component: Privacy });

function Privacy() {
  return (
    <>
      <title>{formatMetaTitle("Privacy policy")}</title>
      <article className="max-w-xl space-y-2">
        <h1 className="text-xl font-medium">Privacy</h1>
        <p>Information about how Soba handles your data will be added before public launch.</p>
      </article>
    </>
  );
}

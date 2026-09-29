import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/terms")({ component: Terms });

function Terms() {
  return (
    <>
      <title>{formatMetaTitle("Terms of use")}</title>
      <article className="max-w-xl space-y-2">
        <h1 className="text-xl font-medium">Terms</h1>
        <p>Terms of use will be added before Soba launches publicly.</p>
      </article>
    </>
  );
}

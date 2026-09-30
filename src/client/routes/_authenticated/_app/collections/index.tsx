import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/collections/")({
  staticData: { breadcrumbs: [{ label: "Collections" }] },
  component: Collections,
});

function Collections() {
  return (
    <>
      <title>{formatMetaTitle("Collections")}</title>
      <div className="grid min-h-full place-items-center p-6">
        <p className="text-olive-500">Coming soon</p>
      </div>
    </>
  );
}

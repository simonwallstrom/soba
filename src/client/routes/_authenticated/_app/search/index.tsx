import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/search/")({
  staticData: { breadcrumbs: [{ label: "Search" }] },
  component: Search,
});

function Search() {
  return (
    <>
      <title>{formatMetaTitle("Search")}</title>
      <div className="grid min-h-full place-items-center p-6">
        <p className="text-olive-500">Coming soon</p>
      </div>
    </>
  );
}

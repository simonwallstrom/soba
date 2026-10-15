import { NotFoundState } from "@client/components/particles/not-found-state";
import { createFileRoute } from "@tanstack/react-router";

// Any URL no app page matches, so a wrong link keeps the sidebar and header. Being behind the
// login, it also sends logged-out visitors to the start page instead.
export const Route = createFileRoute("/_authenticated/_app/$")({
  staticData: { breadcrumbs: [{ label: "Page not found" }] },
  component: () => (
    <NotFoundState
      description="This page doesn’t exist, or the link to it is wrong."
      linkLabel="Go to recipes"
      title="Page not found"
    />
  ),
});

import { Toaster } from "@client/components/ui/toast";
import { formatMetaTitle } from "@client/lib/meta";
import { watchSessionChanges } from "@client/lib/session";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createRootRoute({
  component: Root,
  errorComponent: RootError,
  notFoundComponent: () => (
    <main className="mx-auto max-w-xl space-y-2 p-8">
      <title>{formatMetaTitle("Page not found")}</title>
      <h1 className="text-xl font-medium">Page not found</h1>
      <p>This page does not exist.</p>
      <Link to="/" className="underline">
        Back to Soba
      </Link>
    </main>
  ),
});

function Root() {
  useEffect(
    () =>
      watchSessionChanges(async () => {
        const { storeRegistry } = await import("@client/lib/livestore/adapter");
        await storeRegistry.dispose();
        window.location.replace("/");
      }),
    [],
  );
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

function RootError({ error }: ErrorComponentProps) {
  // Keeps the cause visible in the console behind the generic message.
  useEffect(() => console.error(error), [error]);
  return (
    <main className="mx-auto max-w-xl space-y-2 p-8">
      <title>{formatMetaTitle("Could not load page")}</title>
      <h1 className="text-xl font-medium">Could not load this page</h1>
      <p>Please refresh and try again.</p>
    </main>
  );
}

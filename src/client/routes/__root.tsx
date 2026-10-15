import { WelcomeHeader, WelcomeLayout } from "@client/components/particles/welcome-layout";
import { Button, buttonVariants } from "@client/components/ui/button";
import { Toaster } from "@client/components/ui/toast";
import { formatMetaTitle } from "@client/lib/meta";
import { watchSessionChanges } from "@client/lib/session";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createRootRoute({
  component: Root,
  errorComponent: RootError,
  notFoundComponent: NotFound,
});

function Root() {
  useEffect(
    () =>
      // Signed out in another tab: reloading drops the household's data held in memory.
      watchSessionChanges(async () => window.location.replace("/")),
    [],
  );
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

// A last resort: wrong URLs land in the app's own not-found page (`_app/$.tsx`), or the start
// page when logged out. Logged-out visitors land on the start page from /recipes too.
function NotFound() {
  return (
    <>
      <title>{formatMetaTitle("Page not found")}</title>
      <WelcomeLayout>
        <WelcomeHeader
          description="This page doesn’t exist, or the link to it is wrong."
          title="Page not found"
        />
        <Link className={buttonVariants({ variant: "primary" })} to="/recipes">
          Back to Soba
        </Link>
      </WelcomeLayout>
    </>
  );
}

function RootError({ error }: ErrorComponentProps) {
  // Keeps the cause visible in the console behind the generic message.
  useEffect(() => console.error(error), [error]);
  return (
    <>
      <title>{formatMetaTitle("Could not load page")}</title>
      <WelcomeLayout>
        <WelcomeHeader
          description="Something went wrong loading this page. Check your connection and try again."
          title="Could not load this page"
        />
        {/* A full reload, since whatever failed may have left the app half loaded. */}
        <Button onClick={() => window.location.reload()} variant="primary">
          Try again
        </Button>
      </WelcomeLayout>
    </>
  );
}

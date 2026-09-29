import { PageLoading } from "@client/components/particles/page-loading";
import { resetLocalData } from "@client/lib/local-data";
import { getSession, sessionOptions } from "@client/lib/session";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  // Shown only on a first visit, when there is no cached session to render the shell from.
  // Afterwards the session resolves from memory, well before pendingMs.
  pendingComponent: PageLoading,
  pendingMs: 200,
  pendingMinMs: 500,
  beforeLoad: async () => {
    const { user, household, canCreateHousehold } = await getSession();
    if (!user) throw redirect({ to: "/", replace: true });
    return { user, household, canCreateHousehold };
  },
  component: Authenticated,
});

function Authenticated() {
  const context = Route.useRouteContext();
  const router = useRouter();
  const { data } = useQuery(sessionOptions);

  // Losing access needs a clean slate; any other change only needs fresh route context.
  const accessChanged =
    data !== undefined &&
    (data.user?.id !== context.user.id ||
      (context.household !== null && data.household?.id !== context.household.id));

  // The context holds the cached session's own objects, which keep their identity until
  // the server returns different data.
  const contextStale =
    data !== undefined &&
    (data.user !== context.user ||
      data.household !== context.household ||
      data.canCreateHousehold !== context.canCreateHousehold);

  useEffect(() => {
    if (accessChanged) {
      void resetLocalData().then(() => {
        window.location.replace(data?.user ? (data.household ? "/recipes" : "/onboarding") : "/");
      });
    } else if (contextStale) {
      void router.invalidate();
    }
  }, [accessChanged, contextStale, data, router]);

  if (accessChanged) return <PageLoading />;
  return <Outlet />;
}

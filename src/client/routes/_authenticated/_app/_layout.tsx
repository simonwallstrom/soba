import { householdStoreOptions } from "@client/features/household/store";
import { signOut } from "@client/lib/auth";
import { storeRegistry } from "@client/lib/livestore/adapter";
import { StoreRegistryProvider, useStore } from "@livestore/react";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_authenticated/_app")({
  beforeLoad: ({ context }) => {
    if (!context.household) throw redirect({ to: "/onboarding", replace: true });
    return { household: context.household };
  },
  component: AppLayout,
});

// Keeps the household store open across app pages; suspends while it first opens.
function HouseholdStore({ householdId, children }: { householdId: string; children: ReactNode }) {
  useStore(householdStoreOptions(householdId));
  return children;
}

function AppLayout() {
  const { user, household } = Route.useRouteContext();
  const router = useRouter();
  const [signOutError, setSignOutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const pathname = useLocation({ select: (location) => location.pathname });
  const pageTitle = pathname === "/household" ? "Household" : "Recipes";

  // Load every app page's code up front so the first visit to each is instant.
  useEffect(() => {
    // Route IDs match at runtime; `routesByPath` trims trailing slashes that its type keeps.
    void router.loadRouteChunk(router.routesById["/_authenticated/_app/recipes/"]);
    void router.loadRouteChunk(router.routesById["/_authenticated/_app/household"]);
  }, [router]);

  async function logOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      await signOut();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Could not log out");
      setSigningOut(false);
    }
  }

  return (
    <div className="grid h-dvh w-full grid-cols-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-1">
      <aside className="hidden min-h-0 flex-col py-1.5 lg:flex">
        <div className="flex h-12 shrink-0 items-center gap-1.5 pr-3.5 pl-5.5">
          <Link to="/recipes" className="font-medium">
            Soba
          </Link>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
          <p>{household.name}</p>
          <nav aria-label="App" className="flex flex-col gap-2">
            <Link to="/recipes" activeProps={{ className: "font-medium underline" }}>
              Recipes
            </Link>
            <Link to="/household" activeProps={{ className: "font-medium underline" }}>
              Household
            </Link>
          </nav>
        </div>
        <div className="flex shrink-0 flex-col gap-4 px-3 py-2">
          <p className="text-sm wrap-break-word">{user.email}</p>
          <button
            className="self-start border px-3 py-2"
            disabled={signingOut}
            onClick={() => void logOut()}
          >
            {signingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </aside>
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-olive-50 lg:my-1.5 lg:mr-1.5 lg:rounded-lg lg:border-[0.5px] lg:border-olive-900/18 dark:bg-olive-925 dark:lg:border-olive-100/10">
        <header className="z-10 flex h-12 shrink-0 items-center gap-2 border-b-[0.5px] border-olive-900/18 px-5 font-medium lg:px-6 dark:border-olive-100/10">
          <h1 className="min-w-0 flex-1">{pageTitle}</h1>
        </header>
        {signOutError && (
          <p role="alert" className="px-5 py-2 lg:px-6">
            {signOutError}
          </p>
        )}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="isolate p-5 lg:p-6">
            {/* The shell renders from the cached session; only page content waits for the store. */}
            <StoreRegistryProvider storeRegistry={storeRegistry}>
              <Suspense
                fallback={
                  <p aria-busy="true" className="shimmer text-olive-500">
                    Loading…
                  </p>
                }
              >
                <HouseholdStore householdId={household.id}>
                  <Outlet />
                </HouseholdStore>
              </Suspense>
            </StoreRegistryProvider>
          </div>
        </main>
      </section>
      <nav
        aria-label="Mobile app"
        className="border-t-[0.5px] border-olive-900/18 bg-olive-50 pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-olive-100/10 dark:bg-olive-925"
      >
        <div className="flex items-center justify-around gap-4 px-3 py-2">
          <Link to="/recipes" activeProps={{ className: "font-medium underline" }}>
            Recipes
          </Link>
          <Link to="/household" activeProps={{ className: "font-medium underline" }}>
            Household
          </Link>
          <button disabled={signingOut} onClick={() => void logOut()}>
            {signingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </nav>
    </div>
  );
}

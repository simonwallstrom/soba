import { AppHeaderActionsSlot } from "@client/components/particles/app-header-actions";
import { householdStoreOptions } from "@client/features/household/store";
import { storeRegistry } from "@client/lib/livestore/adapter";
import { StoreRegistryProvider, useStore } from "@livestore/react";
import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { AppHeader } from "./-components/app-header";
import { MobileNav } from "./-components/mobile-nav";
import { Sidebar } from "./-components/sidebar";

export const Route = createFileRoute("/_authenticated/_app")({
  beforeLoad: ({ context }) => {
    if (!context.household) throw redirect({ to: "/onboarding", replace: true });
    return { household: context.household };
  },
  component: AppLayout,
});

// Route IDs match at runtime; `routesByPath` trims trailing slashes that its type keeps.
const appPageIds = [
  "/_authenticated/_app/recipes/",
  "/_authenticated/_app/collections/",
  "/_authenticated/_app/meal-planner/",
  "/_authenticated/_app/search/",
  "/_authenticated/_app/settings/",
  "/_authenticated/_app/household",
] as const;

// Keeps the household store open across app pages; suspends while it first opens.
function HouseholdStore({ householdId, children }: { householdId: string; children: ReactNode }) {
  useStore(householdStoreOptions(householdId));
  return children;
}

function AppLayout() {
  const { user, household } = Route.useRouteContext();
  const router = useRouter();
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);

  // Load every app page's code up front so the first visit to each is instant.
  useEffect(() => {
    for (const id of appPageIds) void router.loadRouteChunk(router.routesById[id]);
  }, [router]);

  return (
    <StoreRegistryProvider storeRegistry={storeRegistry}>
      <div className="grid h-dvh w-full grid-cols-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-1">
        <Sidebar household={household} user={user} />
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-olive-50 lg:my-1.5 lg:mr-1.5 lg:rounded-lg lg:border-[0.5px] lg:border-black/18 dark:bg-olive-925 lg:dark:border-white/10">
          <AppHeader actionsRef={setActionsSlot} />
          {/* The only scrolling element on app pages; the router restores its position. */}
          <main
            className="isolate min-h-0 min-w-0 flex-1 overflow-y-auto"
            data-scroll-restoration-id="app-content"
          >
            {/* The shell renders from the cached session; only page content waits for the store. */}
            <Suspense
              fallback={
                <p aria-busy="true" className="shimmer p-5 text-olive-500 lg:p-6">
                  Loading…
                </p>
              }
            >
              <HouseholdStore householdId={household.id}>
                <AppHeaderActionsSlot value={actionsSlot}>
                  <Outlet />
                </AppHeaderActionsSlot>
              </HouseholdStore>
            </Suspense>
          </main>
        </section>
        <MobileNav />
      </div>
    </StoreRegistryProvider>
  );
}

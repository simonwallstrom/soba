import { AppAsideSlot } from "@client/components/particles/app-aside";
import { AppHeaderActionsSlot } from "@client/components/particles/app-header-actions";
import { AppToolbarSlot } from "@client/components/particles/app-toolbar";
import { householdStoreOptions, householdStoreReady } from "@client/features/household/store";
import { RecipeImportWatcher } from "@client/features/recipes/recipe-import-watcher";
import {
  RecipeSearchRequestProvider,
  useRequestRecipeSearch,
} from "@client/features/recipes/search-request";
import { storeRegistry } from "@client/lib/livestore/adapter";
import { formatMetaTitle } from "@client/lib/meta";
import { StoreRegistryProvider, useStore } from "@livestore/react";
import { createFileRoute, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { Suspense, use, useEffect, useState } from "react";
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
  "/_authenticated/_app/meal-planner/",
  "/_authenticated/_app/settings/",
  "/_authenticated/_app/household",
] as const;

// Keeps the household store open across app pages; suspends while it first opens.
function HouseholdStore({ householdId, children }: { householdId: string; children: ReactNode }) {
  use(householdStoreReady(householdId));
  useStore(householdStoreOptions(householdId));
  return children;
}

function AppLayout() {
  const { user, household } = Route.useRouteContext();
  const router = useRouter();
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);
  const [asideSlot, setAsideSlot] = useState<HTMLDivElement | null>(null);
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null);
  // Load every app page's code up front so the first visit to each is instant.
  useEffect(() => {
    for (const id of appPageIds) void router.loadRouteChunk(router.routesById[id]);
  }, [router]);

  return (
    <StoreRegistryProvider storeRegistry={storeRegistry}>
      <RecipeSearchRequestProvider>
        <SearchShortcuts />
        <div className="grid h-dvh w-full grid-cols-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-1 lg:pt-[env(safe-area-inset-top)] lg:pb-[env(safe-area-inset-bottom)]">
          <Sidebar household={household} user={user} />
          <section className="flex min-h-0 min-w-0 overflow-hidden bg-olive-50 lg:my-1.5 lg:mr-1.5 lg:rounded-lg lg:border-[0.5px] lg:border-black/18 dark:bg-olive-925 lg:dark:border-white/10">
            <div className="flex min-w-0 flex-1 flex-col">
              <AppHeader actionsRef={setActionsSlot} />
              {/* A page's toolbar, outside the scrolling content so it never moves with it. */}
              <div
                className="shrink-0 pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] empty:hidden"
                ref={setToolbarSlot}
              />
              {/* The only scrolling element on app pages; the router restores its position. */}
              <main
                className="isolate min-h-0 min-w-0 flex-1 overflow-y-auto pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]"
                data-scroll-restoration-id="app-content"
              >
                {/* The shell renders from the cached session; only page content waits for the store. */}
                <Suspense
                  fallback={
                    <p aria-busy="true" className="shimmer p-5 text-olive-500 lg:p-6">
                      <title>{formatMetaTitle("Loading")}</title>
                      Loading…
                    </p>
                  }
                >
                  <HouseholdStore householdId={household.id}>
                    <RecipeImportWatcher householdId={household.id} userId={user.id} />
                    <AppHeaderActionsSlot value={actionsSlot}>
                      <AppToolbarSlot value={toolbarSlot}>
                        <AppAsideSlot value={asideSlot}>
                          <Outlet />
                        </AppAsideSlot>
                      </AppToolbarSlot>
                    </AppHeaderActionsSlot>
                  </HouseholdStore>
                </Suspense>
              </main>
            </div>
            {/* A page's side panel lays out as if it were a direct child of the section. */}
            <div className="contents" ref={setAsideSlot} />
          </section>
          <MobileNav />
        </div>
      </RecipeSearchRequestProvider>
    </StoreRegistryProvider>
  );
}

// ⌘K (Ctrl+K elsewhere) and `/` jump to the recipe search from anywhere in the app. `/` waits
// while you are typing somewhere.
function SearchShortcuts() {
  const requestSearch = useRequestRecipeSearch();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCommandK = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      const isSlash = event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!isCommandK && !isSlash) return;
      const target = event.target;
      if (
        isSlash &&
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select"))
      ) {
        return;
      }
      event.preventDefault();
      requestSearch();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [requestSearch]);

  return null;
}

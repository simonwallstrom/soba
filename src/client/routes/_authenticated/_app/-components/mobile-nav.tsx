import { GetStartedChecklist } from "@client/features/get-started/checklist";
import { useRequestRecipeSearch } from "@client/features/recipes/search-request";
import { Link, useLocation } from "@tanstack/react-router";
import { Suspense } from "react";
import type { ComponentProps, MouseEvent } from "react";

import { mobileNavigation } from "./app-navigation";

// A tab bar in the style of iOS: equal columns, each an icon over its label, tinted when active.
export function MobileNav(
  props: Pick<ComponentProps<typeof GetStartedChecklist>, "household" | "user">,
) {
  const requestSearch = useRequestRecipeSearch();
  const pathname = useLocation({ select: (location) => location.pathname });

  // Tapping Recipes while on the list scrolls it to the top and focuses its search, keeping any
  // filters. The focus has to happen during the tap for the phone to raise its keyboard.
  function handleRecipesClick(event: MouseEvent) {
    if (pathname !== "/recipes") return;
    event.preventDefault();
    document
      .querySelector("[data-scroll-restoration-id=app-content]")
      ?.scrollTo({ top: 0, behavior: "smooth" });
    requestSearch();
  }

  // Only on the tabs themselves, leaving recipe pages and forms their whole height.
  const onTab = mobileNavigation.some(({ to }) => to === pathname);

  return (
    // The page's own background, so the bar seems to float at the end of it.
    <div className="bg-white lg:hidden dark:bg-olive-925">
      {/* Above the tab bar rather than over the page, so it never covers the end of a list. */}
      {onTab && (
        <Suspense fallback={null}>
          <GetStartedChecklist
            className="mx-2 mb-2 w-[calc(100%-1rem)] pointer-coarse:mx-3 pointer-coarse:w-[calc(100%-1.5rem)]"
            compact
            {...props}
          />
        </Suspense>
      )}
      <nav
        aria-label="Main navigation"
        className="border-t-[0.5px] border-black/18 bg-white pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] dark:border-white/10 dark:bg-olive-925"
      >
        <div className="grid grid-cols-3">
          {mobileNavigation.map(({ icon: Icon, label, to }) => (
            <Link
              className="flex h-12 min-w-0 flex-col items-center justify-center gap-1 text-olive-400 select-none [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:-outline-offset-2 active:text-olive-950 dark:text-olive-500 dark:active:text-white pointer-coarse:h-14 [&.active]:text-olive-950 dark:[&.active]:text-white"
              key={to}
              onClick={to === "/recipes" ? handleRecipesClick : undefined}
              to={to}
            >
              <Icon className="size-5" />
              <span className="max-w-full truncate px-1 text-[0.6875rem] leading-3.5 font-medium">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

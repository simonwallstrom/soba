import { createRouter } from "@tanstack/react-router";
import type { LinkOptions, ParsedLocation } from "@tanstack/react-router";
import type { ComponentType } from "react";

import { routeTree } from "./routeTree.gen";

// Pages that place their own scroll on arrival, like the meal planner, opt out.
function restoresScroll({ location }: { location: ParsedLocation }): boolean {
  return !router.matchRoutes(location).some((match) => match.staticData.placesOwnScroll);
}

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // App pages scroll inside the layout's main element, not the window.
  scrollRestoration: restoresScroll,
  scrollToTopSelectors: ['[data-scroll-restoration-id="app-content"]'],
});

// One item in the app header's trail. A component label can read data, like a recipe's title.
export type Breadcrumb = {
  label: string | ComponentType;
  link?: LinkOptions;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }

  interface StaticDataRouteOption {
    // The full trail the app header shows for this page; the last item is the page heading.
    breadcrumbs?: Breadcrumb[];
    // The page scrolls itself into place on arrival, so the router neither restores nor resets it.
    placesOwnScroll?: boolean;
  }
}

import { createRouter } from "@tanstack/react-router";
import type { LinkOptions } from "@tanstack/react-router";
import type { ComponentType } from "react";

import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // App pages scroll inside the layout's main element, not the window.
  scrollRestoration: true,
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
  }
}

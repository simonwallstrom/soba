import { createContext, use } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

// The element the app layout reserves for a page's toolbar, between the header and the
// scrolling content.
export const AppToolbarSlot = createContext<HTMLElement | null>(null);

// Renders a page's toolbar under the app header while the page keeps its state. It stays put
// while the content scrolls, even through an overscroll bounce, which a sticky bar inside the
// content would follow.
export function AppToolbar({ children }: { children: ReactNode }) {
  const slot = use(AppToolbarSlot);
  return slot ? createPortal(children, slot) : null;
}

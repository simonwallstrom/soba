import { createContext, use } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

// The element the app layout reserves for page actions in its header.
export const AppHeaderActionsSlot = createContext<HTMLElement | null>(null);

// Renders a page's buttons in the app header while the page keeps their state.
export function AppHeaderActions({ children }: { children: ReactNode }) {
  const slot = use(AppHeaderActionsSlot);
  return slot ? createPortal(children, slot) : null;
}

// The element right after the page title in the app header, for things about the page itself.
// It hides with the title on small screens, where a back link takes its place.
export const AppHeaderTitleSlot = createContext<HTMLElement | null>(null);

export function AppHeaderTitleActions({ children }: { children: ReactNode }) {
  const slot = use(AppHeaderTitleSlot);
  return slot ? createPortal(children, slot) : null;
}

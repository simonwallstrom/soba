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

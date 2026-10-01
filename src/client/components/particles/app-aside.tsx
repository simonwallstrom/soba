import { createContext, use } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

// The element the app layout reserves for a page's side panel, beside the header and content.
export const AppAsideSlot = createContext<HTMLElement | null>(null);

// Renders a page's side panel in the app layout while the page keeps its state.
export function AppAside({ children }: { children: ReactNode }) {
  const slot = use(AppAsideSlot);
  return slot ? createPortal(children, slot) : null;
}

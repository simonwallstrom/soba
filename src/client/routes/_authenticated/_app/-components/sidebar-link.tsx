import { Link } from "@tanstack/react-router";
import type { LinkComponentProps } from "@tanstack/react-router";
import { cn } from "cn";

// Sidebar rows: navigation links and the account menu trigger.
export const sidebarItemStyles = [
  "flex h-8 items-center gap-2.5 rounded-lg px-3 text-olive-800 outline-none dark:text-olive-400",
  "hover:bg-olive-200 hover:text-inherit active:bg-olive-300/50 dark:hover:bg-olive-900/50 dark:active:bg-olive-900",
  "focus-visible:outline-2 focus-visible:-outline-offset-1",
  "[&_svg]:shrink-0 [&_svg]:opacity-80 [:hover,:active,.active]:[&_svg]:opacity-100",
];

export function SidebarLink({
  showActiveState = false,
  ...props
}: Omit<LinkComponentProps, "className"> & { showActiveState?: boolean }) {
  return (
    <Link
      className={cn(
        sidebarItemStyles,
        showActiveState &&
          "[&.active]:bg-olive-300/50 [&.active]:text-inherit dark:[&.active]:bg-olive-900",
      )}
      {...props}
    />
  );
}

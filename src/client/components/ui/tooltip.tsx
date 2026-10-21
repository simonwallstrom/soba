import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "cn";
import type { ReactElement } from "react";

// Shares the delay across the app's tooltips: the first waits 600ms, and once one has shown, its
// neighbors open at once, like a toolbar's. Mounted once, in the root route.
export function TooltipProvider(props: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider {...props} />;
}

// Names an icon button, or adds a word to a control, for mouse and keyboard users. Keep it to a
// few words, and repeat the button's `aria-label`. Touch screens don't show tooltips, so nothing
// important should live only here. It closes as the pointer leaves the control, rather than
// staying open while you hover it, so it never covers the next button you reach for.
export function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root disableHoverablePopup {...props} />;
}

// Render the control with `render`, like `<TooltipTrigger render={<Button … />} />`.
export function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

export function TooltipContent({
  align = "center",
  className,
  side = "bottom",
  sideOffset = 6,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        className="isolate z-50"
        data-slot="tooltip-positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          className={cn(
            // Dark and small, so it reads as a label rather than a menu, which is white.
            "pointer-events-none origin-(--transform-origin) rounded-md bg-olive-900 px-2 py-1 font-medium text-sm text-olive-50 shadow-md",
            // Softer than the menus' quick pop, as a hint shouldn't snap: it grows in and shrinks
            // out over 150ms. Moving between neighbors swaps it at once.
            "transition-[scale,opacity] duration-150 data-instant:duration-0",
            "data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0",
            "dark:bg-olive-700 dark:text-olive-50 dark:inset-shadow-[0_0.5px_0_var(--color-white)]/14",
            className,
          )}
          data-slot="tooltip-content"
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

// Gives an icon-only control its name as a tooltip, from its `aria-label` unless `label` says
// otherwise, like a shorter "Remove" for "Remove Pasta from the plan". Works for buttons and
// menu triggers alike: `<WithTooltip><Button aria-label="Filter" … /></WithTooltip>`.
export function WithTooltip({
  children,
  label,
  side,
}: {
  children: ReactElement<{ "aria-label"?: string }>;
  label?: string;
  side?: TooltipPrimitive.Positioner.Props["side"];
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>{label ?? children.props["aria-label"]}</TooltipContent>
    </Tooltip>
  );
}

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { Button } from "@client/components/ui/button";
import { Cancel01Icon } from "@client/components/ui/icons";
import { cn } from "cn";

// Drawer is built on Dialog, so Dialog's header, title, description, body, and footer work inside it.

export function Drawer(props: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root {...props} />;
}

export function DrawerTrigger(props: DrawerPrimitive.Trigger.Props) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

export function DrawerClose(props: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

// Matches the dialog's, so a dialog keeps its close button in the same place as a drawer.
const closeButton = (
  <Button
    aria-label="Close"
    className="absolute top-2 right-2 text-olive-500 dark:text-olive-400"
    size="icon"
    variant="ghost"
  />
);

// A bottom sheet. It extends 3rem below the screen, the bleed, so dragging it up never reveals
// a gap underneath. Like current iOS sheets, it closes with a button in the corner rather than
// showing a grabber, and still closes with a swipe down, a tap outside, or Escape.
export function DrawerContent({
  children,
  className,
  showCloseButton = true,
  ...props
}: DrawerPrimitive.Popup.Props & { showCloseButton?: boolean }) {
  return (
    <DrawerPrimitive.VirtualKeyboardProvider>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Backdrop
          className="fixed inset-0 z-50 min-h-dvh bg-black opacity-[calc(var(--backdrop-opacity)*(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] [--backdrop-opacity:0.2] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute dark:[--backdrop-opacity:0.4]"
          data-slot="drawer-backdrop"
        />
        <DrawerPrimitive.Viewport
          className="fixed inset-0 z-50 flex items-end justify-center"
          data-slot="drawer-viewport"
        >
          <DrawerPrimitive.Popup
            className={cn(
              "relative -mb-12 flex max-h-[calc(100dvh-env(safe-area-inset-top))] min-h-0 w-full flex-col gap-6 rounded-t-2xl border-[0.5px] border-b-0 border-black/40 bg-white px-6 pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-olive-900 outline-none sm:max-w-lg",
              "translate-y-(--drawer-swipe-movement-y) transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-swiping:select-none data-ending-style:translate-y-[calc(100%-3rem+2px)] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:translate-y-[calc(100%-3rem+2px)]",
              "before:pointer-events-none before:absolute before:inset-0 before:rounded-t-[calc(var(--radius-2xl)-0.5px)] before:shadow-md before:content-['']",
              "dark:border-white/12 dark:bg-olive-900 dark:text-olive-100 dark:before:inset-[-0.5px] dark:before:rounded-t-2xl dark:before:inset-shadow-[0_0.5px_0_var(--color-white)]/14 dark:before:shadow-black/40",
              className,
            )}
            data-slot="drawer-content"
            {...props}
          >
            {children}
            {showCloseButton && (
              <DrawerPrimitive.Close render={closeButton}>
                <Cancel01Icon />
              </DrawerPrimitive.Close>
            )}
          </DrawerPrimitive.Popup>
        </DrawerPrimitive.Viewport>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.VirtualKeyboardProvider>
  );
}

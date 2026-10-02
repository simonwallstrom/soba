import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { Button } from "@client/components/ui/button";
import { Drawer, DrawerContent } from "@client/components/ui/drawer";
import { Cancel01Icon } from "@client/components/ui/icons";
import { ScrollArea } from "@client/components/ui/scroll-area";
import { useIsMobile } from "@client/lib/media";
import { cn } from "cn";
import { createContext, useContext } from "react";
import type { ComponentProps } from "react";

const closeButton = (
  <Button
    aria-label="Close dialog"
    className="absolute top-2 right-2 text-olive-500 dark:text-olive-400"
    size="icon"
    variant="ghost"
  />
);

// Whether the dialog renders as a swipeable drawer, decided once by the root.
const DrawerModeContext = createContext(false);

// A drawer on small screens and a centered dialog from `sm` up. Drawer is built on Dialog,
// so the trigger, close, title, and description parts work in both.
export function Dialog(props: Pick<DrawerPrimitive.Root.Props, keyof DialogPrimitive.Root.Props>) {
  const isMobile = useIsMobile();
  return (
    <DrawerModeContext value={isMobile}>
      {isMobile ? <Drawer {...props} /> : <DialogPrimitive.Root {...props} />}
    </DrawerModeContext>
  );
}

export function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export function DialogContent({
  align = "center",
  children,
  className,
  showCloseButton = true,
  ...props
}: Omit<DialogPrimitive.Popup.Props, "className" | "render" | "style"> & {
  // Search-first dialogs sit near the top, so the popup grows downward as results change.
  // Drawers ignore it.
  align?: "center" | "top";
  // Static only, since the dialog and drawer popups have different states.
  className?: string;
  // Drawers never show one; they close with a swipe.
  showCloseButton?: boolean;
}) {
  if (useContext(DrawerModeContext)) {
    return (
      <DrawerContent className={className} {...props}>
        {children}
      </DrawerContent>
    );
  }
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/40"
        data-slot="dialog-backdrop"
      />
      <DialogPrimitive.Viewport
        className={cn(
          "fixed inset-0 z-50 grid justify-items-center p-4",
          align === "top" ? "items-start pt-[12dvh]" : "items-center",
        )}
        data-slot="dialog-viewport"
      >
        <DialogPrimitive.Popup
          className={cn(
            "relative flex max-h-[calc(100dvh-2rem)] min-h-0 w-full max-w-lg flex-col gap-6 rounded-2xl border-[0.5px] border-black/40 bg-white p-6 text-olive-900 transition-[scale,opacity] duration-200 ease-in-out will-change-transform outline-none",
            "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-0.5px)] before:shadow-md before:content-['']",
            "data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0",
            "dark:border-white/12 dark:bg-olive-900 dark:text-olive-100 dark:before:inset-[-0.5px] dark:before:rounded-2xl dark:before:inset-shadow-[0_0.5px_0_var(--color-white)]/14 dark:before:shadow-black/40",
            className,
          )}
          data-slot="dialog-content"
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close render={closeButton}>
              <Cancel01Icon />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("grid shrink-0 gap-2 pr-8", className)}
      data-slot="dialog-header"
      {...props}
    />
  );
}

// Scrolls when the content is taller than the dialog; the negative margin keeps focus outlines visible.
export function DialogBody({
  children,
  className,
  scrollFade = true,
  ...props
}: ComponentProps<typeof ScrollArea>) {
  return (
    <ScrollArea
      className={cn("-m-1 flex min-h-0 flex-col", className)}
      data-slot="dialog-body"
      scrollFade={scrollFade}
      viewportClassName="min-h-0 flex-1"
      {...props}
    >
      <div className="p-1">{children}</div>
    </ScrollArea>
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex shrink-0 flex-col gap-2 sm:flex-row", className)}
      data-slot="dialog-footer"
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn("text-xl leading-none font-medium", className)}
      data-slot="dialog-title"
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn("text-olive-500 dark:text-olive-400", className)}
      data-slot="dialog-description"
      {...props}
    />
  );
}

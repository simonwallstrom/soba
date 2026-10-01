import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@client/components/ui/button";
import { Cancel01Icon } from "@client/components/ui/icons";
import { ScrollArea } from "@client/components/ui/scroll-area";
import { cn } from "cn";
import type { ComponentProps } from "react";

const closeButton = (
  <Button
    aria-label="Close dialog"
    className="absolute top-2 right-2 text-olive-500 dark:text-olive-400"
    size="icon"
    variant="ghost"
  />
);

export function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root {...props} />;
}

export function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

// A bottom sheet on small screens and a centered dialog from `sm` up.
export function DialogContent({
  children,
  className,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & { showCloseButton?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/40"
        data-slot="dialog-backdrop"
      />
      <DialogPrimitive.Viewport
        className="fixed inset-0 z-50 grid items-end sm:place-items-center sm:p-4"
        data-slot="dialog-viewport"
      >
        <DialogPrimitive.Popup
          className={cn(
            "relative flex max-h-[calc(100dvh-3rem-env(safe-area-inset-top))] min-h-0 w-full flex-col gap-6 rounded-t-2xl border-[0.5px] border-black/40 bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-olive-900 transition-[translate,scale,opacity] duration-200 ease-in-out will-change-transform outline-none sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg sm:rounded-2xl sm:pb-6",
            "before:pointer-events-none before:absolute before:inset-0 before:rounded-t-[calc(var(--radius-2xl)-0.5px)] before:shadow-md before:content-[''] sm:before:rounded-[calc(var(--radius-2xl)-0.5px)]",
            "data-ending-style:opacity-0 data-starting-style:opacity-0 max-sm:data-ending-style:translate-y-4 max-sm:data-starting-style:translate-y-4 sm:data-ending-style:scale-98 sm:data-starting-style:scale-98",
            "dark:border-white/12 dark:bg-olive-900 dark:text-olive-100 dark:before:inset-[-0.5px] dark:before:rounded-t-2xl dark:before:inset-shadow-[0_0.5px_0_var(--color-white)]/14 dark:before:shadow-black/40 sm:dark:before:rounded-2xl",
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

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { buttonVariants } from "@client/components/ui/button";
import { Cancel01Icon } from "@client/components/ui/icons";
import { cn } from "cn";

// Shows toasts from anywhere, including code outside React: `toast.add({ title, actionProps })`.
export const toast = ToastPrimitive.createToastManager();

// Stacked toasts peek out behind the front one and fan out on hover or focus; each slides in
// from the bottom and can be swiped away. Adapted from shadcn's Base UI toast.
const toastStyles = [
  // The popup surface, as in popupStyles
  "rounded-xl border-[0.5px] border-black/15 bg-white text-olive-900",
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-xl)-0.5px)] before:shadow-lg before:content-['']",
  "dark:border-white/15 dark:bg-olive-800 dark:text-olive-200 dark:before:inset-[-0.5px] dark:before:rounded-xl dark:before:inset-shadow-[0_0.5px_0_var(--color-white)]/14 dark:before:shadow-black/40",

  // Stacking
  "pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-1",
  "[--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
  "h-(--height) [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [transition:transform_500ms_cubic-bezier(0.22,1,0.36,1),opacity_500ms,height_150ms]",
  // Keeps the stack expanded while the pointer crosses the gap between toasts.
  "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
  "data-expanded:h-(--toast-height) data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]",

  // Entering and leaving
  "data-limited:opacity-0 data-starting-style:[transform:translateY(150%)]",
  "[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
  "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
  "data-ending-style:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))]",
  "data-ending-style:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
  "data-ending-style:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
  "motion-reduce:transition-none",
];

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();
  return toasts.map((item) => (
    <ToastPrimitive.Root
      className={cn(toastStyles)}
      key={item.id}
      swipeDirection={["down", "right"]}
      toast={item}
    >
      <ToastPrimitive.Content className="flex h-full items-center gap-3 overflow-hidden py-3 pr-2.5 pl-4 transition-opacity duration-250 data-behind:opacity-0 data-expanded:opacity-100">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ToastPrimitive.Title className="truncate text-sm font-medium" />
          <ToastPrimitive.Description className="text-sm text-olive-500 dark:text-olive-400" />
        </div>
        {item.actionProps && (
          <ToastPrimitive.Action className={cn(buttonVariants({ size: "sm" }), "shrink-0")} />
        )}
        <ToastPrimitive.Close
          aria-label="Dismiss"
          className={cn(
            buttonVariants({ size: "icon-sm", variant: "ghost" }),
            "shrink-0 text-olive-500 hover:text-olive-900 dark:hover:text-olive-100",
          )}
        >
          <Cancel01Icon />
        </ToastPrimitive.Close>
      </ToastPrimitive.Content>
    </ToastPrimitive.Root>
  ));
}

// Renders the toasts added through `toast`. Phones place them above the bottom navigation.
export function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toast}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="pointer-events-none fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto w-auto max-w-sm outline-none sm:right-4 sm:left-auto sm:mx-0 sm:w-full lg:bottom-4">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}

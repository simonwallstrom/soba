import { cn } from "cn";
import type { ComponentProps } from "react";

// A dashed box saying there is nothing here yet, with what to do about it as children.
export function Empty({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-black/15 px-6 py-16 text-center sm:py-24 dark:border-white/15",
        className,
      )}
      data-slot="empty"
      {...props}
    />
  );
}

export function EmptyIcon({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex size-10 items-center justify-center rounded-lg bg-olive-200/70 text-olive-600 dark:bg-olive-800 dark:text-olive-300 [&_svg]:size-5",
        className,
      )}
      data-slot="empty-icon"
      {...props}
    />
  );
}

// The title and description, kept close together.
export function EmptyHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex max-w-sm flex-col items-center gap-1 text-balance", className)}
      data-slot="empty-header"
      {...props}
    />
  );
}

export function EmptyTitle({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("font-medium", className)} data-slot="empty-title" {...props} />;
}

export function EmptyDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("text-olive-500 dark:text-olive-400", className)}
      data-slot="empty-description"
      {...props}
    />
  );
}

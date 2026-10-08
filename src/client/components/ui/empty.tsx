import { cn } from "cn";
import type { ComponentProps } from "react";

// Says there is nothing here, with what to do about it as children. Fills and centers in the
// space it's given, so give its parent a height to center it on the page.
export function Empty({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center",
        className,
      )}
      data-slot="empty"
      {...props}
    />
  );
}

// A watercolor spot illustration, in the style of the start page. Callers set its width.
export function EmptyIllustration({ className, ...props }: ComponentProps<"img">) {
  return (
    <img
      alt=""
      className={cn("mb-2 h-auto dark:opacity-60", className)}
      data-slot="empty-illustration"
      decoding="async"
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

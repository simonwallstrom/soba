import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cn } from "cn";
import type { ComponentProps } from "react";

// Rings match the content panel behind them so overlapping avatars read as separate circles.
const pageRing = "ring-2 ring-olive-50 dark:ring-olive-925";

export function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & { size?: "default" | "sm" | "lg" }) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none",
        "data-[size=lg]:size-10 data-[size=sm]:size-5",
        className,
      )}
      data-size={size}
      data-slot="avatar"
      {...props}
    />
  );
}

export function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      className={cn("aspect-square size-full rounded-full object-cover", className)}
      data-slot="avatar-image"
      {...props}
    />
  );
}

export function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-olive-200 text-sm leading-none text-olive-600 dark:bg-olive-800 dark:text-olive-400",
        "group-data-[size=sm]/avatar:text-[10px]",
        className,
      )}
      data-slot="avatar-fallback"
      {...props}
    />
  );
}

export function AvatarBadge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        pageRing,
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-olive-800 text-white select-none dark:bg-olive-200 dark:text-olive-950",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className,
      )}
      data-slot="avatar-badge"
      {...props}
    />
  );
}

export function AvatarGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "group/avatar-group flex -space-x-2 has-data-[size=sm]:-space-x-1.5",
        "*:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-olive-50 dark:*:data-[slot=avatar]:ring-olive-925",
        className,
      )}
      data-slot="avatar-group"
      {...props}
    />
  );
}

export function AvatarGroupCount({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        pageRing,
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-olive-200 text-sm leading-none text-olive-600 select-none dark:bg-olive-800 dark:text-olive-400",
        "group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-5 group-has-data-[size=sm]/avatar-group:text-[10px]",
        "[&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className,
      )}
      data-slot="avatar-group-count"
      {...props}
    />
  );
}

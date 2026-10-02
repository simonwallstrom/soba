import { cn } from "cn";
import type { ComponentProps } from "react";

// A decorative, lazily loaded image with a hairline inner border.
export function ImageThumbnail({
  className,
  ...props
}: Omit<ComponentProps<"img">, "alt" | "children"> & { height: number; width: number }) {
  return (
    <div
      className={cn(
        "pointer-events-none relative overflow-hidden rounded-lg select-none",
        className,
      )}
      data-slot="image-thumbnail"
    >
      <img
        alt=""
        className="absolute inset-0 size-full object-cover"
        draggable={false}
        loading="lazy"
        {...props}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-[inherit] ring-[0.5px] ring-black/20 ring-inset dark:ring-white/20"
      />
    </div>
  );
}

// Stands in for a missing image: quieter than a photo, with the same hairline border, and an
// icon centered inside. Size the icon with `[&_svg]:size-*`.
export function ImagePlaceholder({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none flex items-center justify-center rounded-lg bg-olive-100 text-olive-400 ring-[0.5px] ring-black/10 ring-inset select-none dark:bg-olive-900 dark:text-olive-600 dark:ring-white/10",
        className,
      )}
      data-slot="image-placeholder"
      {...props}
    />
  );
}

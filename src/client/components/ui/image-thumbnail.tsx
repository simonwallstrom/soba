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

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "cn";

// Lets content shrink below its intrinsic width so text can wrap inside the viewport.
const contentStyle = { minWidth: 0 };

export function ScrollArea({
  children,
  className,
  scrollFade = false,
  scrollRestorationId,
  scrollbarGutter = false,
  viewportClassName,
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  // Fades the edges that have more content to scroll to.
  scrollFade?: boolean;
  scrollRestorationId?: string;
  // Reserves room so the scrollbar never covers content.
  scrollbarGutter?: boolean;
  viewportClassName?: string;
}) {
  return (
    <ScrollAreaPrimitive.Root
      className={cn("relative min-h-0 min-w-0 overflow-hidden", className)}
      data-slot="scroll-area"
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        className={cn(
          "size-full rounded-[inherit] outline-none",
          scrollFade &&
            "mask-t-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-start)))] mask-r-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-end)))] mask-b-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-end)))] mask-l-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-start)))] [--fade-size:1.5rem]",
          scrollbarGutter && "data-has-overflow-x:pb-2.5 data-has-overflow-y:pr-2.5",
          viewportClassName,
        )}
        data-scroll-restoration-id={scrollRestorationId}
        data-slot="scroll-area-viewport"
      >
        <ScrollAreaPrimitive.Content role="presentation" style={contentStyle}>
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="vertical" />
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
    </ScrollAreaPrimitive.Root>
  );
}

export function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      className={cn(
        "z-30 m-1 flex touch-none opacity-0 transition-opacity delay-300 select-none",
        "data-hovering:opacity-100 data-hovering:delay-0 data-hovering:duration-100",
        "data-scrolling:opacity-100 data-scrolling:delay-0 data-scrolling:duration-100",
        "data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:flex-col",
        "data-[orientation=vertical]:w-1.5",
        className,
      )}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        className="relative flex-1 rounded-full bg-black/20 dark:bg-white/20"
        data-slot="scroll-area-thumb"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

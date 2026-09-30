import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

export const toggleVariants = cva(
  [
    // Base
    "inline-flex items-center justify-center font-medium whitespace-nowrap select-none",

    // Hover, active, and pressed
    "hover:bg-black/5 dark:hover:bg-white/6",
    "active:bg-black/10 data-pressed:bg-black/10 dark:active:bg-white/10 dark:data-pressed:bg-white/10",

    // Focus
    "focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1",

    // Disabled
    "disabled:pointer-events-none disabled:bg-black/5 disabled:text-black/35 dark:disabled:bg-white/5 dark:disabled:text-white/35",

    // Icons
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:opacity-80 [:hover,:active,[data-pressed]]:[&_svg]:opacity-100",
  ],
  {
    variants: {
      variant: {
        // Filled like the other controls; dark states step up from the white/5 fill.
        outline: [
          "border border-black/18 bg-white dark:border-white/15 dark:bg-white/5",
          "dark:hover:bg-white/10 dark:active:bg-white/15 dark:data-pressed:bg-white/15",
        ],
        ghost: "",
      },
      size: {
        default: "h-8 gap-3 rounded-lg px-3",
        sm: "h-7 gap-2 rounded-lg px-2",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  },
);

export function Toggle({
  className,
  size,
  variant,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      className={cn(toggleVariants({ size, variant }), className)}
      data-slot="toggle"
      {...props}
    />
  );
}

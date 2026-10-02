import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

export const buttonVariants = cva(
  [
    // Base
    "inline-flex items-center justify-center font-medium whitespace-nowrap select-none",

    // Focus
    "focus-visible:outline-2 focus-visible:outline-offset-1",

    // Active
    "[:active,[data-pressed]]:scale-99",

    // Disabled
    "disabled:pointer-events-none disabled:bg-black/5 disabled:text-black/35 dark:disabled:bg-white/5 dark:disabled:text-white/35",

    // Icons
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:opacity-80 [:hover,:active]:[&_svg]:opacity-100",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-black/8 dark:bg-white/8",
          "hover:bg-black/12 dark:hover:bg-white/12",
          "[:active,[data-pressed]]:bg-black/16 dark:[:active,[data-pressed]]:bg-white/16",
        ],
        primary: [
          "bg-olive-800 text-olive-50 dark:bg-olive-200 dark:text-olive-950",
          "hover:bg-olive-900 dark:hover:bg-olive-100",
          "[:active,[data-pressed]]:bg-olive-950 dark:[:active,[data-pressed]]:bg-white",
        ],
        // Confirms an action that cannot be undone, like deleting.
        destructive: [
          "bg-red-600 text-white dark:bg-red-500",
          "hover:bg-red-700 dark:hover:bg-red-600",
          "[:active,[data-pressed]]:bg-red-800 dark:[:active,[data-pressed]]:bg-red-700",
        ],
        ghost: [
          "hover:bg-black/5 dark:hover:bg-white/6",
          "[:active,[data-pressed]]:bg-black/10 dark:[:active,[data-pressed]]:bg-white/10",
        ],
      },
      size: {
        default: "h-8 gap-3 rounded-lg px-3",
        sm: "h-7 gap-2 rounded-lg px-2",
        icon: "size-8 rounded-full",
        "icon-sm": "size-7 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant, size }), className)}
      data-slot="button"
      {...props}
    />
  );
}

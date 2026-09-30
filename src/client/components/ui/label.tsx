import { cn } from "cn";
import type { ComponentProps } from "react";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    // Callers associate the label through `htmlFor` or by nesting its control.
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      className={cn(
        "flex w-fit items-center gap-2 font-medium select-none",
        "group-data-[disabled=true]/field:pointer-events-none group-data-[disabled=true]/field:text-black/35 peer-disabled:cursor-not-allowed peer-disabled:text-black/35 dark:group-data-[disabled=true]/field:text-white/35 dark:peer-disabled:text-white/35",
        className,
      )}
      data-slot="label"
      {...props}
    />
  );
}

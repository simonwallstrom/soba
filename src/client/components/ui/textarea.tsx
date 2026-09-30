import { controlStyles } from "@client/components/ui/styles";
import { cn } from "cn";
import type { ComponentProps } from "react";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        controlStyles,
        "field-sizing-content min-h-16 w-full resize-y px-2.5 py-2",
        className,
      )}
      data-slot="textarea"
      {...props}
    />
  );
}

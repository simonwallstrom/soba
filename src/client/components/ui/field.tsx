import { Label } from "@client/components/ui/label";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

export function FieldSet({ className, ...props }: ComponentProps<"fieldset">) {
  return (
    <fieldset
      className={cn("flex min-w-0 flex-col gap-3", className)}
      data-slot="field-set"
      {...props}
    />
  );
}

export function FieldLegend({ className, ...props }: ComponentProps<"legend">) {
  return (
    <legend className={cn("mb-2 font-medium", className)} data-slot="field-legend" {...props} />
  );
}

export function FieldGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("group/field-group flex w-full flex-col gap-4", className)}
      data-slot="field-group"
      {...props}
    />
  );
}

const fieldVariants = cva("group/field flex w-full gap-2", {
  variants: {
    orientation: {
      horizontal:
        "flex-row items-center *:data-[slot=field-label]:flex-auto has-[>[role=radio]]:*:data-[slot=field-label]:font-normal",
      vertical: "flex-col",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

export function Field({
  className,
  orientation = "vertical",
  ...props
}: ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      className={cn(fieldVariants({ orientation }), className)}
      data-orientation={orientation}
      data-slot="field"
      {...props}
    />
  );
}

export function FieldLabel(props: ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" {...props} />;
}

export function FieldDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm text-olive-500 dark:text-olive-400", className)}
      data-slot="field-description"
      {...props}
    />
  );
}

// Shows `children` when given; otherwise the unique messages from `errors`.
export function FieldError({
  children,
  className,
  errors,
  ...props
}: ComponentProps<"div"> & {
  errors?: ReadonlyArray<{ message?: string } | undefined>;
}) {
  const messages = [...new Set(errors?.flatMap((error) => error?.message ?? []))];
  let content: ReactNode = children;

  if (content == null) {
    if (messages.length === 1) {
      content = messages[0];
    } else if (messages.length > 1) {
      content = (
        <ul className="ml-4 list-disc">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      );
    }
  }

  if (content == null) return null;

  return (
    <div
      className={cn("text-sm text-red-600 dark:text-red-400", className)}
      data-slot="field-error"
      role="alert"
      {...props}
    >
      {content}
    </div>
  );
}

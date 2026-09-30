import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { toggleVariants } from "@client/components/ui/toggle";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { createContext, useContext } from "react";
import type { CSSProperties } from "react";

type ToggleGroupContextValue = VariantProps<typeof toggleVariants> & {
  orientation: "horizontal" | "vertical";
  spacing: number;
};

const ToggleGroupContext = createContext<ToggleGroupContextValue>({
  orientation: "horizontal",
  spacing: 1,
});

// `spacing` is in Tailwind spacing units; 0 joins the items into one segmented control.
export function ToggleGroup({
  className,
  orientation = "horizontal",
  size,
  spacing = 1,
  style,
  variant,
  children,
  ...props
}: ToggleGroupPrimitive.Props & VariantProps<typeof toggleVariants> & { spacing?: number }) {
  const spacingStyle: CSSProperties & { "--toggle-group-spacing": string } = {
    "--toggle-group-spacing": `calc(var(--spacing) * ${spacing})`,
  };

  return (
    <ToggleGroupPrimitive
      className={cn(
        "group/toggle-group flex w-fit items-center gap-(--toggle-group-spacing) data-[orientation=vertical]:flex-col",
        className,
      )}
      data-slot="toggle-group"
      data-spacing={spacing}
      orientation={orientation}
      style={
        typeof style === "function"
          ? (state) => ({ ...spacingStyle, ...style(state) })
          : { ...spacingStyle, ...style }
      }
      {...props}
    >
      <ToggleGroupContext value={{ orientation, size, spacing, variant }}>
        {children}
      </ToggleGroupContext>
    </ToggleGroupPrimitive>
  );
}

export function ToggleGroupItem({
  className,
  size,
  variant,
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  const context = useContext(ToggleGroupContext);

  return (
    <TogglePrimitive
      className={cn(
        toggleVariants({ size: size ?? context.size, variant: variant ?? context.variant }),
        "shrink-0 data-[spacing=0]:rounded-none",
        "data-[orientation=horizontal]:data-[spacing=0]:not-first:border-l-0 data-[orientation=horizontal]:data-[spacing=0]:first:rounded-l-lg data-[orientation=horizontal]:data-[spacing=0]:last:rounded-r-lg",
        "data-[orientation=vertical]:data-[spacing=0]:not-first:border-t-0 data-[orientation=vertical]:data-[spacing=0]:first:rounded-t-lg data-[orientation=vertical]:data-[spacing=0]:last:rounded-b-lg",
        className,
      )}
      data-orientation={context.orientation}
      data-slot="toggle-group-item"
      data-spacing={context.spacing}
      {...props}
    />
  );
}

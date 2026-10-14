import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { choiceFocusStyles } from "@client/components/ui/styles";
import { cn } from "cn";

// An on/off setting that applies at once. Colored like a checked checkbox when on.
export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        choiceFocusStyles,
        "relative inline-flex h-5 w-8 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors",
        "bg-black/15 data-checked:bg-olive-900 dark:bg-white/15 dark:data-checked:bg-olive-200",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      data-slot="switch"
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="size-4 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-3 motion-reduce:transition-none dark:data-checked:bg-olive-900"
        data-slot="switch-thumb"
      />
    </SwitchPrimitive.Root>
  );
}

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon } from "@client/components/ui/icons";
import { choiceFocusStyles, choiceStyles } from "@client/components/ui/styles";
import { cn } from "cn";

export function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        choiceStyles,
        choiceFocusStyles,
        "relative cursor-pointer rounded-sm",
        className,
      )}
      data-slot="checkbox"
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="flex size-full items-center justify-center data-indeterminate:[&>span]:block data-indeterminate:[&>svg]:hidden data-unchecked:[&>svg]:opacity-0"
        data-slot="checkbox-indicator"
        keepMounted
      >
        <CheckIcon />
        <span className="hidden h-0.5 w-2.5 rounded-full bg-current" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

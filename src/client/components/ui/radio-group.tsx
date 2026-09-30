import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { choiceFocusStyles, choiceStyles } from "@client/components/ui/styles";
import { cn } from "cn";

// Base UI clones this element and applies the radio's accessible name through `aria-labelledby`.
// oxlint-disable-next-line jsx-a11y/control-has-associated-label
const radioButton = <button type="button" />;

export function RadioGroup<Value>({ className, ...props }: RadioGroupPrimitive.Props<Value>) {
  return (
    <RadioGroupPrimitive
      className={cn("grid w-full gap-1.5", className)}
      data-slot="radio-group"
      {...props}
    />
  );
}

export function RadioGroupItem<Value>({ className, ...props }: RadioPrimitive.Root.Props<Value>) {
  return (
    <RadioPrimitive.Root
      className={cn(
        choiceStyles,
        choiceFocusStyles,
        // Widens the hit area without changing the layout.
        "peer relative rounded-full after:absolute after:-inset-x-3 after:-inset-y-2",
        className,
      )}
      data-slot="radio-group-item"
      nativeButton
      render={radioButton}
      {...props}
    >
      <RadioPrimitive.Indicator
        className="flex size-full items-center justify-center"
        data-slot="radio-group-indicator"
      >
        <span className="size-1.5 rounded-full bg-current" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  );
}

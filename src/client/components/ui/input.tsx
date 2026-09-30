import { Input as InputPrimitive } from "@base-ui/react/input";
import { controlStyles } from "@client/components/ui/styles";
import { cn } from "cn";

export function Input({ className, ...props }: InputPrimitive.Props) {
  return (
    <InputPrimitive
      className={cn(
        controlStyles,
        "h-8 w-full px-2.5",
        "file:mr-2 file:inline-flex file:h-8 file:border-0 file:bg-transparent file:p-0 file:font-medium file:text-current",
        className,
      )}
      data-slot="input"
      {...props}
    />
  );
}

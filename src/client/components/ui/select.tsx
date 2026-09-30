import { Select as SelectPrimitive } from "@base-ui/react/select";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SelectorIcon,
} from "@client/components/ui/icons";
import {
  controlStyles,
  itemStyles,
  popupLabelStyles,
  popupSeparatorStyles,
  popupStyles,
} from "@client/components/ui/styles";
import { cn } from "cn";

const triggerIcon = <SelectorIcon />;

export function Select<Value, Multiple extends boolean | undefined = false>(
  props: SelectPrimitive.Root.Props<Value, Multiple>,
) {
  return <SelectPrimitive.Root {...props} />;
}

export function SelectGroup(props: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

export function SelectValue(props: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

export function SelectTrigger({
  children,
  className,
  size = "default",
  ...props
}: SelectPrimitive.Trigger.Props & { size?: "default" | "sm" }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        controlStyles,
        "flex w-full items-center justify-between gap-2 pr-2 pl-2.5 text-left whitespace-nowrap data-[size=default]:h-8 data-[size=sm]:h-7",
        "data-placeholder:text-olive-400 dark:data-placeholder:text-olive-600",
        "*:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:opacity-80",
        className,
      )}
      data-size={size}
      data-slot="select-trigger"
      {...props}
    >
      {children}
      <SelectPrimitive.Icon render={triggerIcon} />
    </SelectPrimitive.Trigger>
  );
}

// By default the selected item opens over the trigger, like a native select.
export function SelectContent({
  align = "center",
  alignItemWithTrigger = true,
  alignOffset = 0,
  children,
  className,
  side = "bottom",
  sideOffset = 4,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignItemWithTrigger" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        align={align}
        alignItemWithTrigger={alignItemWithTrigger}
        alignOffset={alignOffset}
        className="isolate z-50 outline-none"
        data-slot="select-positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <SelectPrimitive.Popup
          className={cn(
            popupStyles,
            "isolate min-w-(--anchor-width) data-[align-trigger=true]:transition-none",
            className,
          )}
          data-align-trigger={alignItemWithTrigger}
          data-slot="select-content"
          {...props}
        >
          <SelectPrimitive.ScrollUpArrow className={scrollArrowStyles("top-0")}>
            <ChevronUpIcon />
          </SelectPrimitive.ScrollUpArrow>
          <SelectPrimitive.List className="relative max-h-(--available-height) overflow-y-auto rounded-[inherit] p-1">
            {children}
          </SelectPrimitive.List>
          <SelectPrimitive.ScrollDownArrow className={scrollArrowStyles("bottom-0")}>
            <ChevronDownIcon />
          </SelectPrimitive.ScrollDownArrow>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function scrollArrowStyles(edge: "top-0" | "bottom-0") {
  return cn(
    "sticky z-10 flex h-7 w-full cursor-default items-center justify-center bg-white dark:bg-olive-800",
    edge,
  );
}

export function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      className={cn(popupLabelStyles, className)}
      data-slot="select-label"
      {...props}
    />
  );
}

export function SelectItem({ children, className, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      className={cn(itemStyles, "relative flex w-full items-center pr-8 pl-2.5", className)}
      data-slot="select-item"
      {...props}
    >
      <SelectPrimitive.ItemText className="min-w-0 truncate">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2.5">
        <CheckIcon />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      className={cn(popupSeparatorStyles, className)}
      data-slot="select-separator"
      {...props}
    />
  );
}

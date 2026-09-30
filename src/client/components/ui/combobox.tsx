import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Cancel01Icon, CheckIcon, SelectorIcon } from "@client/components/ui/icons";
import {
  choiceItemStyles,
  choiceStyles,
  controlStyles,
  inlineButtonStyles,
  itemStyles,
  popupLabelStyles,
  popupSeparatorStyles,
  popupStyles,
  textEntryStyles,
} from "@client/components/ui/styles";
import { cn } from "cn";
import { useRef } from "react";
import type { ComponentProps } from "react";

export function Combobox<Value, Multiple extends boolean | undefined = false, Item = Value>(
  props: ComboboxPrimitive.Root.Props<Value, Multiple, Item>,
) {
  return <ComboboxPrimitive.Root {...props} />;
}

export function ComboboxValue(props: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

export function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      className={cn(inlineButtonStyles, className)}
      data-slot="combobox-trigger"
      {...props}
    >
      {children ?? <SelectorIcon />}
    </ComboboxPrimitive.Trigger>
  );
}

// A select-style trigger for a combobox whose input lives inside the popup.
export function ComboboxButton({ className, children, ...props }: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      className={cn(
        controlStyles,
        "flex h-8 w-full items-center justify-between gap-2 pr-2 pl-2.5 text-left whitespace-nowrap",
        "data-placeholder:text-olive-400 dark:data-placeholder:text-olive-600",
        "*:data-[slot=combobox-value]:min-w-0 *:data-[slot=combobox-value]:truncate",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:opacity-80",
        className,
      )}
      data-slot="combobox-button"
      {...props}
    >
      {children}
      <SelectorIcon />
    </ComboboxPrimitive.Trigger>
  );
}

export function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      aria-label="Clear selection"
      className={cn(inlineButtonStyles, className)}
      data-slot="combobox-clear"
      {...props}
    >
      <Cancel01Icon />
    </ComboboxPrimitive.Clear>
  );
}

// `popup` renders a borderless search field for the top of a popup.
export function ComboboxInput({
  className,
  disabled = false,
  showClear = false,
  showTrigger = true,
  variant = "default",
  ...props
}: ComboboxPrimitive.Input.Props & {
  showClear?: boolean;
  showTrigger?: boolean;
  variant?: "default" | "popup";
}) {
  return (
    <div
      className={cn(
        "relative w-full",
        variant === "popup" &&
          "border-b-[0.5px] border-black/15 has-aria-invalid:border-red-500 dark:border-white/15 dark:has-aria-invalid:border-red-400",
        className,
      )}
      data-slot="combobox-input"
    >
      <ComboboxPrimitive.Input
        className={cn(
          variant === "default"
            ? [controlStyles, "h-8 w-full px-2.5"]
            : [
                textEntryStyles,
                "h-9 w-full min-w-0 bg-transparent px-3 outline-none disabled:text-black/35 dark:disabled:text-white/35",
              ],
          showClear && showTrigger ? "pr-14" : "pr-8",
        )}
        disabled={disabled}
        {...props}
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-1">
        {showClear && <ComboboxClear disabled={disabled} />}
        {showTrigger && <ComboboxTrigger aria-label="Show options" disabled={disabled} />}
      </div>
    </div>
  );
}

export function ComboboxContent({
  align = "start",
  alignOffset = 0,
  anchor,
  className,
  side = "bottom",
  sideOffset = 4,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "align" | "alignOffset" | "anchor" | "side" | "sideOffset"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50 outline-none"
        data-slot="combobox-positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <ComboboxPrimitive.Popup
          className={cn(
            popupStyles,
            "isolate max-h-(--available-height) w-(--anchor-width) max-w-(--available-width)",
            className,
          )}
          data-slot="combobox-content"
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

export function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      className={cn(
        "relative max-h-(--available-height) overflow-y-auto overscroll-contain rounded-[inherit] p-1 empty:p-0",
        className,
      )}
      data-slot="combobox-list"
      {...props}
    />
  );
}

export function ComboboxItem({ children, className, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      className={cn(itemStyles, "relative flex w-full items-center pr-8 pl-2.5", className)}
      data-slot="combobox-item"
      {...props}
    >
      <span className="min-w-0 truncate">{children}</span>
      <ComboboxPrimitive.ItemIndicator className="absolute right-2.5">
        <CheckIcon />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

// Marks the selected indicator with `data-checked` so it picks up the checkbox's checked style.
function renderCheckboxIndicator(
  props: ComponentProps<"span">,
  state: ComboboxPrimitive.ItemIndicator.State,
) {
  return <span {...props} data-checked={state.selected ? "" : undefined} />;
}

// For multiple selection.
export function ComboboxCheckboxItem({
  children,
  className,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      className={cn(choiceItemStyles, "w-full", className)}
      data-slot="combobox-checkbox-item"
      {...props}
    >
      <ComboboxPrimitive.ItemIndicator
        className={cn(choiceStyles, "rounded-sm not-data-checked:[&_svg]:opacity-0")}
        keepMounted
        render={renderCheckboxIndicator}
      >
        <CheckIcon className="size-3.5" />
      </ComboboxPrimitive.ItemIndicator>
      <span className="min-w-0 truncate">{children}</span>
    </ComboboxPrimitive.Item>
  );
}

export function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      className={cn("px-2.5 py-6 text-center text-olive-500 empty:p-0", className)}
      data-slot="combobox-empty"
      {...props}
    />
  );
}

export function ComboboxGroup(props: ComboboxPrimitive.Group.Props) {
  return <ComboboxPrimitive.Group data-slot="combobox-group" {...props} />;
}

export function ComboboxLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      className={cn(popupLabelStyles, className)}
      data-slot="combobox-label"
      {...props}
    />
  );
}

export function ComboboxCollection(props: ComboboxPrimitive.Collection.Props) {
  return <ComboboxPrimitive.Collection {...props} />;
}

export function ComboboxSeparator({ className, ...props }: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      className={cn(popupSeparatorStyles, className)}
      data-slot="combobox-separator"
      {...props}
    />
  );
}

// The field for a multiple-selection combobox; pass its ref from `useComboboxAnchor` to `ComboboxContent`.
// The trigger stays on the first row as chips wrap, inset 4px like the chips so its corners stay concentric.
export function ComboboxChips({
  children,
  className,
  showTrigger = true,
  ...props
}: ComboboxPrimitive.Chips.Props & { showTrigger?: boolean }) {
  return (
    <ComboboxPrimitive.Chips
      className={cn(
        "relative flex min-h-8 w-full min-w-0 flex-wrap items-center gap-1 rounded-lg border border-black/18 bg-white px-1 py-[3px] dark:border-white/15 dark:bg-white/5",
        showTrigger && "pr-8",
        "focus-within:outline-2 focus-within:-outline-offset-1",
        "has-aria-invalid:border-red-500 has-aria-invalid:outline-red-500 dark:has-aria-invalid:border-red-400 dark:has-aria-invalid:outline-red-400",
        "has-[input:disabled]:pointer-events-none has-[input:disabled]:border-black/6 has-[input:disabled]:bg-black/5 has-[input:disabled]:text-black/35 dark:has-[input:disabled]:border-white/5 dark:has-[input:disabled]:bg-white/3 dark:has-[input:disabled]:text-white/35",
        className,
      )}
      data-slot="combobox-chips"
      {...props}
    >
      {children}
      {showTrigger && (
        <ComboboxTrigger aria-label="Show options" className="absolute top-[3px] right-[3px]" />
      )}
    </ComboboxPrimitive.Chips>
  );
}

export function ComboboxChip({
  children,
  className,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & { showRemove?: boolean }) {
  return (
    <ComboboxPrimitive.Chip
      className={cn(
        "flex h-6 max-w-full items-center gap-1 rounded-md bg-black/6 pr-0.5 pl-2 dark:bg-white/8",
        "has-disabled:pointer-events-none has-disabled:opacity-50",
        className,
      )}
      data-slot="combobox-chip"
      {...props}
    >
      <span className="min-w-0 truncate">{children}</span>
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          aria-label="Remove item"
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm opacity-70 outline-none hover:bg-black/8 hover:opacity-100 focus-visible:outline-2 focus-visible:-outline-offset-1 dark:hover:bg-white/10"
          data-slot="combobox-chip-remove"
        >
          <Cancel01Icon className="size-3.5" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

export function ComboboxChipsInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      className={cn(
        "h-6 min-w-20 flex-1 bg-transparent px-1 outline-none disabled:pointer-events-none",
        textEntryStyles,
        className,
      )}
      data-slot="combobox-chips-input"
      {...props}
    />
  );
}

export function useComboboxAnchor() {
  return useRef<HTMLDivElement | null>(null);
}

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CheckIcon, ChevronRightIcon } from "@client/components/ui/icons";
import {
  choiceItemStyles,
  choiceStyles,
  edgeAlignOffset,
  itemStyles,
  popupLabelStyles,
  popupSeparatorStyles,
  popupStyles,
} from "@client/components/ui/styles";
import { cn } from "cn";
import type { ComponentProps } from "react";

export function DropdownMenu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root {...props} />;
}

export function DropdownMenuTrigger(props: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

export function DropdownMenuContent({
  align = "start",
  alignOffset,
  children,
  className,
  side = "bottom",
  sideOffset = 4,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        alignOffset={alignOffset ?? edgeAlignOffset(align)}
        className="isolate z-50 outline-none"
        data-slot="dropdown-menu-positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          className={cn(popupStyles, "flex min-w-36", className)}
          data-slot="dropdown-menu-content"
          {...props}
        >
          <div className="max-h-(--available-height) w-full overflow-y-auto p-1">{children}</div>
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuGroup(props: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

export function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & { inset?: boolean }) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn(popupLabelStyles, "data-inset:pl-9", className)}
      data-inset={inset}
      data-slot="dropdown-menu-label"
      {...props}
    />
  );
}

export function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  // Lines the text up with checkbox and radio items.
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <MenuPrimitive.Item
      className={cn(
        itemStyles,
        "flex items-center gap-1.5 px-2.5 data-inset:pl-9 [&_svg]:opacity-80 data-highlighted:[&_svg]:opacity-100",
        "data-[variant=destructive]:text-red-600 dark:data-[variant=destructive]:text-red-400",
        "data-highlighted:data-[variant=destructive]:bg-red-50 data-highlighted:active:data-[variant=destructive]:bg-red-100 dark:data-highlighted:data-[variant=destructive]:bg-red-950/40 dark:data-highlighted:active:data-[variant=destructive]:bg-red-950/60",
        className,
      )}
      data-inset={inset}
      data-slot="dropdown-menu-item"
      data-variant={variant}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({
  children,
  className,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      className={cn(choiceItemStyles, className)}
      data-slot="dropdown-menu-checkbox-item"
      {...props}
    >
      <MenuPrimitive.CheckboxItemIndicator
        className={cn(choiceStyles, "rounded-sm data-unchecked:[&_svg]:opacity-0")}
        keepMounted
      >
        <CheckIcon className="size-3.5" />
      </MenuPrimitive.CheckboxItemIndicator>
      <span className="min-w-0 truncate">{children}</span>
    </MenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuRadioGroup(props: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

export function DropdownMenuRadioItem({
  children,
  className,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      className={cn(choiceItemStyles, className)}
      data-slot="dropdown-menu-radio-item"
      {...props}
    >
      <MenuPrimitive.RadioItemIndicator
        className={cn(choiceStyles, "rounded-full data-unchecked:[&>span]:opacity-0")}
        keepMounted
      >
        <span className="size-1.5 rounded-full bg-current" />
      </MenuPrimitive.RadioItemIndicator>
      <span className="min-w-0 truncate">{children}</span>
    </MenuPrimitive.RadioItem>
  );
}

export function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      className={cn(popupSeparatorStyles, className)}
      data-slot="dropdown-menu-separator"
      {...props}
    />
  );
}

export function DropdownMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest text-olive-500", className)}
      data-slot="dropdown-menu-shortcut"
      {...props}
    />
  );
}

export function DropdownMenuSub(props: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot {...props} />;
}

export function DropdownMenuSubTrigger({
  children,
  className,
  inset,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & { inset?: boolean }) {
  return (
    <MenuPrimitive.SubmenuTrigger
      className={cn(
        itemStyles,
        "flex items-center gap-1.5 pr-2 pl-2.5 data-inset:pl-9 [&_svg]:opacity-80 data-highlighted:[&_svg]:opacity-100",
        "data-popup-open:bg-black/5 dark:data-popup-open:bg-white/6",
        className,
      )}
      data-inset={inset}
      data-slot="dropdown-menu-sub-trigger"
      {...props}
    >
      {children}
      <ChevronRightIcon className="-mr-0.5 ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

export function DropdownMenuSubContent({
  alignOffset = -4.5,
  sideOffset = 0,
  ...props
}: ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      alignOffset={alignOffset}
      data-slot="dropdown-menu-sub-content"
      side="inline-end"
      sideOffset={sideOffset}
      {...props}
    />
  );
}

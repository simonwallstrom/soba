// Shared class lists that keep the form controls, popups, and menu items in step.

// Placeholder and text selection colours for anything you can type into.
export const textEntryStyles =
  "placeholder:text-olive-400 selection:bg-olive-800 selection:text-olive-50 dark:placeholder:text-olive-600 dark:selection:bg-olive-200 dark:selection:text-olive-950";

// Text fields and select-like triggers; callers add their own size and padding.
export const controlStyles = [
  // Base
  "min-w-0 rounded-lg border border-black/18 bg-white dark:border-white/15 dark:bg-white/5",

  // Placeholder and selection
  textEntryStyles,

  // Focus
  "focus-visible:outline-2 focus-visible:-outline-offset-1",

  // Invalid
  "aria-invalid:border-red-500 aria-invalid:outline-red-500 dark:aria-invalid:border-red-400 dark:aria-invalid:outline-red-400",

  // Disabled
  "disabled:pointer-events-none disabled:border-black/6 disabled:bg-black/5 disabled:text-black/35 dark:disabled:border-white/5 dark:disabled:bg-white/3 dark:disabled:text-white/35",
];

// Checkbox and radio controls, including the indicators inside menu and combobox items.
export const choiceStyles = [
  // Base
  "flex size-4.5 shrink-0 items-center justify-center border border-black/18 bg-white text-olive-900 dark:border-white/15 dark:bg-white/5 dark:text-olive-100",

  // Checked and indeterminate
  "data-checked:border-olive-900 data-checked:bg-olive-900 data-checked:text-white data-indeterminate:border-olive-900 data-indeterminate:bg-olive-900 data-indeterminate:text-white",
  "dark:data-checked:border-olive-200 dark:data-checked:bg-olive-200 dark:data-checked:text-olive-900 dark:data-indeterminate:border-olive-200 dark:data-indeterminate:bg-olive-200 dark:data-indeterminate:text-olive-900",

  // Disabled
  "data-disabled:pointer-events-none data-disabled:border-black/6 data-disabled:bg-black/5 data-disabled:text-black/35 dark:data-disabled:border-white/5 dark:data-disabled:bg-white/3 dark:data-disabled:text-white/35",
];

// Focus and invalid states for a standalone checkbox or radio.
export const choiceFocusStyles = [
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
  "aria-invalid:border-red-500 aria-invalid:outline-red-500 dark:aria-invalid:border-red-400 dark:aria-invalid:outline-red-400",
  "data-invalid:border-red-500 data-invalid:outline-red-500 dark:data-invalid:border-red-400 dark:data-invalid:outline-red-400",
];

// Floating surfaces: popovers, menus, selects, and comboboxes.
export const popupStyles = [
  "relative origin-(--transform-origin) rounded-xl border-[0.5px] border-black/15 bg-white text-olive-900 transition-[scale,opacity] duration-100 outline-none",
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-xl)-0.5px)] before:shadow-lg before:content-['']",
  "data-starting-style:scale-98 data-starting-style:opacity-0",
  "dark:border-white/15 dark:bg-olive-800 dark:text-olive-200 dark:before:inset-[-0.5px] dark:before:rounded-xl dark:before:inset-shadow-[0_0.5px_0_var(--color-white)]/14 dark:before:shadow-black/40",
];

// Nudges edge-aligned popups outward so their contents line up with the trigger's.
export function edgeAlignOffset(align: "start" | "center" | "end" | undefined) {
  return align === "center" ? undefined : -4;
}

// Rows inside a popup.
export const itemStyles = [
  "cursor-default rounded-lg py-1.5 outline-none select-none",
  "data-highlighted:bg-black/5 data-highlighted:active:bg-black/10 dark:data-highlighted:bg-white/6 dark:data-highlighted:active:bg-white/10",
  "data-disabled:pointer-events-none data-disabled:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
];

// Rows with a checkbox or radio indicator in the first column. Inset rows use `pl-9` to line up with their text.
export const choiceItemStyles = [
  ...itemStyles,
  "grid grid-cols-[1.125rem_1fr] items-center gap-2 pr-4 pl-2.5",
];

export const popupLabelStyles = "px-2.5 pt-1.5 pb-1 text-sm font-medium text-olive-500";

export const popupSeparatorStyles = "-mx-1 my-1 h-[0.5px] bg-black/15 dark:bg-white/15";

// Small square icon buttons inside other controls. Inset 4px from a `rounded-lg` (12px) control,
// so `rounded-md` (8px) keeps the corners concentric.
export const inlineButtonStyles = [
  "inline-flex size-6 shrink-0 items-center justify-center rounded-md outline-none",
  "hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/6 dark:active:bg-white/10",
  "focus-visible:outline-2 focus-visible:-outline-offset-1",
  "disabled:pointer-events-none disabled:opacity-50",
];

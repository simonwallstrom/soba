import { cn } from "cn";
import type { ReactNode } from "react";

// A titled card of rows, with an optional note under it, like a section of iOS Settings.
export function SettingsGroup({
  children,
  id,
  note,
  title,
}: {
  children: ReactNode;
  // For links straight to the group, like the sidebar's "Manage tags".
  id?: string;
  note?: ReactNode;
  title?: string;
}) {
  return (
    <section className="flex scroll-mt-6 flex-col gap-4" id={id}>
      {/* The rows' padding plus the card's 1px border, so the text lines up with theirs. */}
      {(title || note) && (
        <div className="px-[calc(--spacing(3)+1px)]">
          {title && <h2 className="text-lg font-medium">{title}</h2>}
          {note && <p className="text-sm text-olive-500">{note}</p>}
        </div>
      )}
      <div className="flex flex-col divide-y rounded-xl border bg-white dark:bg-white/3">
        {children}
      </div>
    </section>
  );
}

// One line in a group; callers render it as a div, button, or link.
export const settingsRowStyles = "flex min-h-12 items-center gap-3 p-3";

// A row edited in place, with Cancel and Save at its end. On phones the buttons take their own
// line under the field, which would otherwise be left too narrow to read; give the form `flex-wrap`.
export const inlineEditActionsStyles =
  "flex shrink-0 gap-2 max-sm:order-last max-sm:basis-full max-sm:justify-end";

// Rows that act when pressed. The first and last round to fit the card's corners, so their hover
// stays inside it, and the outline reaches 1px out to cover the card's border and dividers.
export const settingsButtonRowStyles = [
  settingsRowStyles,
  "w-full text-left font-medium hover:bg-black/4 focus-visible:outline-2 focus-visible:-outline-offset-1 active:bg-black/8 disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-white/4 dark:active:bg-white/8",
  "first:rounded-t-[calc(var(--radius-xl)-1px)] last:rounded-b-[calc(var(--radius-xl)-1px)]",
  "[&_svg]:shrink-0 [&_svg]:opacity-80",
];

// A labeled value with an optional action at the end. Labels share one width, so values line up
// in every card. On phones the label sits above the value. A control (named by `htmlFor`) keeps
// some room below its label, with the action on its own line under the control; plain text reads
// as one block, with the action centered beside both lines.
export function SettingsField({
  action,
  children,
  htmlFor,
  label,
}: {
  action?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  label: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 p-3",
        htmlFor
          ? "gap-y-2 [grid-template-areas:'label_label'_'value_value'_'._action']"
          : "[grid-template-areas:'label_action'_'value_action']",
        // Without an action, the value reaches the row's end rather than leaving an empty column.
        action
          ? "sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:[grid-template-areas:'label_value_action']"
          : "sm:grid-cols-[10rem_minmax(0,1fr)] sm:[grid-template-areas:'label_value']",
      )}
    >
      {htmlFor ? (
        <label className="text-olive-600 [grid-area:label] dark:text-olive-400" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <span className="text-olive-600 [grid-area:label] dark:text-olive-400">{label}</span>
      )}
      <div className="flex min-w-0 items-center [grid-area:value]">{children}</div>
      {action && (
        <div className={cn("flex gap-2 [grid-area:action]", htmlFor && "max-sm:mt-1")}>
          {action}
        </div>
      )}
    </div>
  );
}

// An icon as wide as the avatars in the rows above it, so the icon centers under them and the
// text lines up with their names.
export function SettingsRowIcon({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex w-8 shrink-0 items-center justify-center", className)}>
      {children}
    </span>
  );
}

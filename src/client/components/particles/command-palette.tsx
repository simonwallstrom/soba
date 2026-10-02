import { ComboboxInput, ComboboxList } from "@client/components/ui/combobox";
import { DialogContent } from "@client/components/ui/dialog";
import { useIsMobile } from "@client/lib/media";
import { cn } from "cn";
import { useRef } from "react";
import type { ComponentProps, ReactNode } from "react";

// A search-first dialog in the style of a command menu: an optional context chip, an inline
// Combobox with a `popup` search field, and key hints. Anchored near the top on desktop and a
// drawer on phones. It has no visible title, so `aria-label` names it.
export function CommandPaletteContent({
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof DialogContent>, "align" | "showCloseButton"> & {
  "aria-label": string;
}) {
  const isMobile = useIsMobile();
  const popupRef = useRef<HTMLDivElement>(null);

  return (
    <DialogContent
      align="top"
      // The list scrolls to the drawer's bottom edge, so only the bleed and safe area pad it.
      className={cn(
        "gap-0 px-0 pt-5 pb-[calc(3rem+env(safe-area-inset-bottom))] sm:max-w-xl sm:p-0",
        className,
      )}
      // Phones focus the drawer itself, so the keyboard waits for a tap on search.
      initialFocus={isMobile ? popupRef : true}
      ref={popupRef}
      showCloseButton={false}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

// On phones, the search, chip, and rows line up with the page's 20px margin. Elsewhere the
// field is taller to sit well under the popup's rounded corners, with its text over the rows'.
export function CommandPaletteInput({ className, ...props }: ComponentProps<typeof ComboboxInput>) {
  return (
    <ComboboxInput
      className={cn("max-sm:[&_input]:px-5 sm:[&_input]:h-12 sm:[&_input]:px-3.5", className)}
      showTrigger={false}
      variant="popup"
      {...props}
    />
  );
}

export function CommandPaletteList({ className, ...props }: ComponentProps<typeof ComboboxList>) {
  return (
    <ComboboxList
      className={cn("max-h-96 max-sm:max-h-[60dvh] max-sm:p-2.5", className)}
      {...props}
    />
  );
}

// Names what the palette acts on, such as the tag recipes are added to.
export function CommandPaletteContext({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex px-3 pb-1 max-sm:px-5 sm:pt-3">
      <span className="flex min-w-0 items-center gap-1.5 rounded-md bg-black/5 px-2 py-1 text-sm dark:bg-white/6">
        <span className="shrink-0 text-olive-500">{label}</span>
        <span aria-hidden="true" className="text-olive-400">
          ·
        </span>
        <span className="truncate font-medium">{children}</span>
      </span>
    </div>
  );
}

// Keyboard hints, so phones leave them out.
export function CommandPaletteFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-t-[0.5px] border-black/15 px-3 py-2 text-sm text-olive-500 max-sm:hidden dark:border-white/15",
        className,
      )}
      data-slot="command-palette-footer"
      {...props}
    />
  );
}

export function CommandPaletteHint({ keys, children }: { keys: string[]; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {keys.map((key) => (
        <kbd
          className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-black/5 px-1 font-sans text-xs dark:bg-white/6"
          key={key}
        >
          {key}
        </kbd>
      ))}
      {children}
    </span>
  );
}

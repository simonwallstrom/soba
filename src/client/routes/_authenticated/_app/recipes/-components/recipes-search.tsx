import { Button } from "@client/components/ui/button";
import { Cancel01Icon, Search01Icon } from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { flushSync } from "react-dom";

// An icon that expands into a search field. It stays open while it holds text, so the
// reason for a shorter list stays visible. On small screens it covers the header.
export function RecipesSearch({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isExpanded = isOpen || value !== "";

  function open() {
    flushSync(() => setIsOpen(true));
    inputRef.current?.focus();
  }

  function close() {
    onChange("");
    flushSync(() => setIsOpen(false));
    triggerRef.current?.focus();
  }

  // `/` opens the search from anywhere on the page, unless you are typing elsewhere.
  useEffect(() => {
    function handleShortcut(event: globalThis.KeyboardEvent) {
      const target = event.target;
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select"))
      ) {
        return;
      }
      event.preventDefault();
      flushSync(() => setIsOpen(true));
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  // Enter leaves the results in view (and hides a touch keyboard). Escape clears the text
  // first, then closes.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (value === "") close();
      else onChange("");
    }
  }

  if (!isExpanded) {
    return (
      <Button
        aria-keyshortcuts="/"
        aria-label="Search recipes"
        onClick={open}
        ref={triggerRef}
        size="icon"
        variant="ghost"
      >
        <Search01Icon />
      </Button>
    );
  }

  return (
    <search className="flex items-center gap-2 max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:z-30 max-lg:h-[calc(3rem+env(safe-area-inset-top))] max-lg:border-b-[0.5px] max-lg:border-black/18 max-lg:bg-olive-50 max-lg:pt-[env(safe-area-inset-top)] max-lg:pr-[max(1.25rem,env(safe-area-inset-right))] max-lg:pl-[max(1.25rem,env(safe-area-inset-left))] lg:mr-1 max-lg:dark:border-white/10 max-lg:dark:bg-olive-925">
      <div className="relative flex-1 lg:w-60">
        <Search01Icon className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-olive-500" />
        <Input
          aria-label="Search recipes"
          className="pr-8 pl-8"
          onBlur={() => {
            if (value === "") setIsOpen(false);
          }}
          onChange={(event) => onChange(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search recipes…"
          enterKeyHint="search"
          ref={inputRef}
          value={value}
        />
        {value !== "" && (
          <Button
            aria-label="Clear search"
            className="absolute top-1/2 right-1 size-6 -translate-y-1/2 rounded-md"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            size="icon-sm"
            variant="ghost"
          >
            <Cancel01Icon />
          </Button>
        )}
      </div>
      <Button className="lg:hidden" onClick={close} size="sm" variant="ghost">
        Cancel
      </Button>
    </search>
  );
}

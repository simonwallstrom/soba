import { Button } from "@client/components/ui/button";
import { Cancel01Icon, Search01Icon } from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import { useRecipeSearchField } from "@client/features/recipes/search-request";
import { cn } from "cn";
import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";

// Large screens show the field beside the page heading. Smaller ones show it over the header
// while it has focus or text, opened from the bottom bar's Search, so the reason for a shorter
// list stays visible.
export function RecipesSearch({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isShownOnSmallScreens = isOpen || value !== "";

  useRecipeSearchField(inputRef);

  function close() {
    onChange("");
    setIsOpen(false);
  }

  // Enter leaves the results in view (and hides a touch keyboard). Escape clears the text
  // first, then leaves the field.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (value === "") {
        setIsOpen(false);
        event.currentTarget.blur();
      } else {
        onChange("");
      }
    }
  }

  return (
    <search
      className={cn(
        "mr-auto ml-3 flex items-center gap-2",
        // Hidden fields cannot take focus, so a closed one stays rendered but out of sight.
        !isShownOnSmallScreens && "max-lg:pointer-events-none max-lg:opacity-0",
        "max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:z-30 max-lg:m-0 max-lg:h-[calc(3rem+env(safe-area-inset-top))] max-lg:border-b-[0.5px] max-lg:border-black/18 max-lg:bg-olive-50 max-lg:pt-[env(safe-area-inset-top)] max-lg:pr-[max(1.25rem,env(safe-area-inset-right))] max-lg:pl-[max(1.25rem,env(safe-area-inset-left))] max-lg:dark:border-white/10 max-lg:dark:bg-olive-925",
      )}
    >
      <div className="group relative flex-1 lg:w-64">
        <Search01Icon className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-olive-500" />
        <Input
          aria-keyshortcuts="/ Meta+K Control+K"
          aria-label="Search recipes"
          className="pr-8 pl-8"
          enterKeyHint="search"
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            if (value === "") setIsOpen(false);
          }}
          onChange={(event) => onChange(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search recipes…"
          ref={inputRef}
          value={value}
        />
        {value === "" ? (
          <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded bg-black/6 px-1.5 font-sans text-xs text-olive-500 group-focus-within:hidden max-lg:hidden dark:bg-white/8">
            /
          </kbd>
        ) : (
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

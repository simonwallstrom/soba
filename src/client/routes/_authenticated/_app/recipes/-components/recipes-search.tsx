import { Button } from "@client/components/ui/button";
import { Cancel01Icon, Search01Icon } from "@client/components/ui/icons";
import { textEntryStyles } from "@client/components/ui/styles";
import { useRecipeSearchField } from "@client/features/recipes/search-request";
import { cn } from "cn";
import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";

// An icon that opens a search field in the heading's place. It stays open while it holds text,
// so the reason for a shorter list stays visible.
//
// The field stays rendered while closed, only out of sight, so the icon and the app's search
// shortcuts can focus it straight away. Phones raise the keyboard only for that.
export function RecipesSearch({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const registerField = useRecipeSearchField();
  const isOpen = isFocused || value !== "";

  function close() {
    onChange("");
    inputRef.current?.blur();
  }

  // Enter leaves the results in view (and hides a touch keyboard). Escape clears the text
  // first, then closes.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (value === "") event.currentTarget.blur();
      else onChange("");
    }
  }

  return (
    <search
      className={cn("flex items-center", isOpen && "mr-1 flex-1 gap-2")}
      data-replaces-heading={isOpen || undefined}
    >
      {isOpen ? (
        <Search01Icon className="shrink-0 text-olive-500" />
      ) : (
        <Button
          aria-label="Search recipes"
          aria-keyshortcuts="/ Meta+K Control+K"
          onClick={() => inputRef.current?.focus()}
          size="icon"
          title="Search (/)"
          variant="ghost"
        >
          <Search01Icon />
        </Button>
      )}
      <input
        aria-label="Search recipes"
        className={cn(
          textEntryStyles,
          isOpen
            ? "h-8 min-w-0 flex-1 bg-transparent outline-none [&::-webkit-search-cancel-button]:appearance-none"
            : "sr-only",
        )}
        enterKeyHint="search"
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onChange(event.currentTarget.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search recipes…"
        ref={(input) => {
          inputRef.current = input;
          return registerField(input);
        }}
        tabIndex={isOpen ? undefined : -1}
        type="search"
        value={value}
      />
      {isOpen && (
        <Button
          aria-label="Close search"
          // Keeps focus in the field, so closing does not first blur it into a half-closed state.
          onMouseDown={(event) => event.preventDefault()}
          onClick={close}
          size="icon"
          variant="ghost"
        >
          <Cancel01Icon />
        </Button>
      )}
    </search>
  );
}

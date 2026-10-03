import { Button } from "@client/components/ui/button";
import { Cancel01Icon, Search01Icon } from "@client/components/ui/icons";
import { textEntryStyles } from "@client/components/ui/styles";
import { useRecipeSearchField } from "@client/features/recipes/search-request";
import { cn } from "cn";
import type { KeyboardEvent } from "react";

// A borderless field that leads the list bar, as tall as its parent so all of it takes a click.
// The app's search shortcuts focus it.
export function RecipesSearch({
  className,
  onChange,
  value,
}: {
  className?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const registerField = useRecipeSearchField();

  // Enter leaves the results in view (and hides a touch keyboard). Escape clears the text
  // first, then leaves the field.
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
    <search className={cn("group/search relative flex items-center", className)}>
      {/* Takes the text colour while the field has focus. */}
      <Search01Icon className="pointer-events-none absolute left-0 text-olive-500 group-focus-within/search:text-inherit" />
      <input
        aria-keyshortcuts="/ Meta+K Control+K"
        aria-label="Search recipes"
        className={cn(
          textEntryStyles,
          "h-full w-full min-w-0 bg-transparent pr-7 pl-6 outline-none [&::-webkit-search-cancel-button]:appearance-none",
        )}
        enterKeyHint="search"
        onChange={(event) => onChange(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search recipes…"
        ref={registerField}
        type="search"
        value={value}
      />
      {value !== "" && (
        <Button
          aria-label="Clear search"
          className="absolute right-0 size-6"
          onClick={() => onChange("")}
          size="icon-sm"
          variant="ghost"
        >
          <Cancel01Icon />
        </Button>
      )}
    </search>
  );
}

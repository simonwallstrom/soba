import { Button } from "@client/components/ui/button";
import { Cancel01Icon, Search01Icon } from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import { useRecipeSearchField } from "@client/features/recipes/search-request";
import { cn } from "cn";
import type { KeyboardEvent } from "react";

// The field beside the header's title. The app's search shortcuts focus it.
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
      {/* Takes the text color while the field has focus. */}
      <Search01Icon className="pointer-events-none absolute left-2.5 text-olive-500 group-focus-within/search:text-inherit" />
      <Input
        aria-keyshortcuts="/ Meta+K Control+K"
        aria-label="Search recipes"
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:appearance-none"
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
          className="absolute right-1 size-6"
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

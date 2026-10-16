import { Button } from "@client/components/ui/button";
import { Cancel01Icon, Search01Icon } from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import { useRecipeSearchField } from "@client/features/recipes/search-request";
import { cn } from "cn";
import { useState } from "react";
import type { KeyboardEvent } from "react";

// The field that leads the header's list controls. The app's search shortcuts focus it.
// On phones it rests as an icon beside the page title and opens over the title while in use.
// The field stays in the page as that icon, so a tap on it, or on the nav's search, focuses it
// during the tap and raises the keyboard.
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
  const [isFocused, setIsFocused] = useState(false);
  const isExpanded = isFocused || value !== "";

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
    <search
      className={cn("group/search relative flex items-center", className)}
      data-expanded={isExpanded}
    >
      {/* Takes the text color while the field has focus. */}
      <Search01Icon className="pointer-events-none absolute left-2.5 text-olive-500 group-focus-within/search:text-inherit max-sm:group-data-[expanded=false]/search:left-2 max-sm:group-data-[expanded=false]/search:text-inherit max-sm:group-data-[expanded=false]/search:opacity-80 max-sm:group-data-[expanded=false]/search:group-hover/search:opacity-100 pointer-coarse:max-sm:group-data-[expanded=false]/search:left-3" />
      <Input
        aria-keyshortcuts="/ Meta+K Control+K"
        aria-label="Search recipes"
        className={cn(
          "pr-8 pl-8 [&::-webkit-search-cancel-button]:appearance-none",
          // Resting on a phone, it looks like the round icon buttons beside it.
          "max-sm:group-data-[expanded=false]/search:size-8 pointer-coarse:max-sm:group-data-[expanded=false]/search:size-10 max-sm:group-data-[expanded=false]/search:cursor-pointer max-sm:group-data-[expanded=false]/search:rounded-full max-sm:group-data-[expanded=false]/search:border-transparent max-sm:group-data-[expanded=false]/search:bg-transparent max-sm:group-data-[expanded=false]/search:p-0 max-sm:group-data-[expanded=false]/search:placeholder:text-transparent max-sm:group-data-[expanded=false]/search:hover:bg-black/5 dark:max-sm:group-data-[expanded=false]/search:hover:bg-white/6",
        )}
        enterKeyHint="search"
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onChange(event.currentTarget.value)}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search recipes…"
        ref={registerField}
        type="search"
        value={value}
      />
      {value !== "" && (
        <Button
          aria-label="Clear search"
          className="absolute right-1 size-6 pointer-coarse:size-8"
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

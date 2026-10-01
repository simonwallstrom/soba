import { badgeVariants } from "@client/components/ui/badge";
import {
  Combobox,
  ComboboxCheckboxItem,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  useComboboxAnchor,
} from "@client/components/ui/combobox";
import { Add01Icon, Cancel01Icon } from "@client/components/ui/icons";
import { compareNames } from "@client/features/recipes/recipe-tags";
import { cn } from "cn";
import { useState } from "react";

// Stands in the list for "Create …" so it can be picked like any tag.
const createItem = "\0create";

// Selected tags as removable chips, with a searchable list of tags. Typing a name that no tag
// has offers to create it; `onCreate` returns the new tag's ID.
export function TagPicker({
  onChange,
  onCreate,
  selected,
  tags,
}: {
  onChange: (ids: string[]) => void;
  onCreate: (name: string) => string;
  selected: readonly string[];
  tags: readonly { id: string; name: string }[];
}) {
  const anchor = useComboboxAnchor();
  const [query, setQuery] = useState("");
  const names = new Map(tags.map((tag) => [tag.id, tag.name]));
  const name = query.trim();
  const canCreate =
    name !== "" &&
    !tags.some((tag) => tag.name.localeCompare(name, "sv-SE", { sensitivity: "base" }) === 0);
  const ids = tags
    .toSorted((left, right) => compareNames(left.name, right.name))
    .map((tag) => tag.id);

  function handleValueChange(next: string[]) {
    if (!next.includes(createItem)) {
      onChange(next);
      return;
    }
    onChange([...next.filter((id) => id !== createItem), onCreate(name)]);
    setQuery("");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" ref={anchor}>
      {selected.map((id) => (
        <span className={badgeVariants({ className: "pr-0.5" })} key={id}>
          {names.get(id)}
          <button
            aria-label={`Remove ${names.get(id)}`}
            className="flex size-4 cursor-pointer items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-2 dark:hover:bg-white/12"
            onClick={() => onChange(selected.filter((tagId) => tagId !== id))}
            type="button"
          >
            <Cancel01Icon />
          </button>
        </span>
      ))}
      <Combobox
        autoHighlight
        inputValue={query}
        itemToStringLabel={(id: string) => (id === createItem ? name : (names.get(id) ?? ""))}
        items={canCreate ? [...ids, createItem] : ids}
        multiple
        onInputValueChange={setQuery}
        onValueChange={handleValueChange}
        value={[...selected]}
      >
        {/* Once tags are chosen, a round plus beside them is enough. */}
        <ComboboxTrigger
          aria-label="Add tags"
          className={cn(
            badgeVariants(),
            "cursor-pointer text-olive-500 hover:bg-black/12 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/12",
            selected.length > 0 && "size-5 px-0",
          )}
        >
          <Add01Icon />
          {selected.length === 0 && "Add tags"}
        </ComboboxTrigger>
        <ComboboxContent anchor={anchor} className="w-60">
          <ComboboxInput
            aria-label="Search or create tags"
            placeholder="Search or create…"
            showTrigger={false}
            variant="popup"
          />
          <ComboboxEmpty>No tags yet. Type a name to create one.</ComboboxEmpty>
          <ComboboxList className="max-h-64">
            {(id: string) =>
              id === createItem ? (
                <ComboboxItem key={id} value={id}>
                  Create “{name}”
                </ComboboxItem>
              ) : (
                <ComboboxCheckboxItem key={id} value={id}>
                  {names.get(id)}
                </ComboboxCheckboxItem>
              )
            }
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

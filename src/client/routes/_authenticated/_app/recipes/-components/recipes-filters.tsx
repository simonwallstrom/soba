import { Badge } from "@client/components/ui/badge";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuFilter,
  DropdownMenuInput,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import {
  Cancel01Icon,
  CheckIcon,
  FilterIcon,
  HashtagIcon,
  StarIcon,
  UserCircle02Icon,
} from "@client/components/ui/icons";
import type { HouseholdMember } from "@client/features/household/members";
import type { Tag } from "@shared/recipes";
import { useState } from "react";

import { recipeFilterFields } from "../-recipe-list";
import type { RecipeFilterField, RecipeListFilters } from "../-recipe-list";

type FieldOption = {
  value: RecipeFilterField;
  label: string;
  plural: string;
  unknown: string;
  Icon: typeof HashtagIcon;
  // Several tags narrow the list together; a recipe has one author, so that is one choice.
  multiple: boolean;
};

const fields: Record<RecipeFilterField, FieldOption> = {
  tags: {
    value: "tags",
    label: "Tag",
    plural: "tags",
    unknown: "Unknown tag",
    Icon: HashtagIcon,
    multiple: true,
  },
  authors: {
    value: "authors",
    label: "Added by",
    plural: "members",
    unknown: "Unknown member",
    Icon: UserCircle02Icon,
    multiple: false,
  },
};

const fieldOptions = recipeFilterFields.map((field) => fields[field]);

type FilterProps = {
  // The household's tags and members, sorted by name.
  tags: readonly Tag[];
  members: readonly HouseholdMember[];
  filters: RecipeListFilters;
  onChange: (field: RecipeFilterField, ids: string[]) => void;
  onFavoritesChange: (favorites: boolean) => void;
};

function getValueLabels(field: RecipeFilterField, { tags, members }: FilterProps) {
  const values = field === "tags" ? tags : members;
  return new Map(values.map((value) => [value.id, value.name]));
}

// What a field's values menu needs around its items, whether it opens from the filter menu or
// from a chip.
function valuesContentProps(field: RecipeFilterField) {
  const { label, plural } = fields[field];
  return {
    className: "w-64",
    empty: `No ${plural} found.`,
    search: (
      <DropdownMenuInput
        aria-label={`Filter by ${label.toLowerCase()}`}
        placeholder={`Search ${plural}…`}
      />
    ),
  };
}

// A searchable menu of fields, each opening a searchable submenu of its values, then favorites,
// which is yes or no and so switches right there. Every menu highlights its first item, so Enter
// works before typing.
export function RecipesFilter(props: FilterProps) {
  return (
    <DropdownMenuFilter autoHighlight="always">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Filter recipes"
          className={buttonVariants({ size: "icon", variant: "ghost" })}
          title="Filter"
        >
          <FilterIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56"
          empty="No filters found."
          search={<DropdownMenuInput aria-label="Filter by" placeholder="Filter by…" />}
        >
          {fieldOptions.map((option) => (
            <DropdownMenuFilter autoHighlight="always" key={option.value}>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <option.Icon />
                  {option.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent {...valuesContentProps(option.value)}>
                  <FilterValues {...props} field={option.value} />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuFilter>
          ))}
          <DropdownMenuItem
            onClick={() => props.onFavoritesChange(props.filters.favorites !== true)}
          >
            <StarIcon />
            Favorites
            {props.filters.favorites === true && <CheckIcon className="ml-auto" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </DropdownMenuFilter>
  );
}

// Tags pick several with checkboxes. A single choice, like the author, picks with a tap and
// closes the menu. Rendered inside the menu, so it starts fresh each time the menu opens.
function FilterValues({ field, ...props }: FilterProps & { field: RecipeFilterField }) {
  const labels = getValueLabels(field, props);
  const selected = props.filters[field] ?? [];
  // Selected values move to the top when the menu opens, but stay put while you pick.
  const [pinned] = useState(() => new Set(selected));
  const order = [...labels.keys()];
  const ids = [...order.filter((id) => pinned.has(id)), ...order.filter((id) => !pinned.has(id))];

  if (fields[field].multiple) {
    return ids.map((id) => (
      <DropdownMenuCheckboxItem
        checked={selected.includes(id)}
        key={id}
        onCheckedChange={(checked) =>
          props.onChange(
            field,
            checked ? [...selected, id] : selected.filter((other) => other !== id),
          )
        }
      >
        {labels.get(id)}
      </DropdownMenuCheckboxItem>
    ));
  }
  return (
    // Picking the current choice again keeps it; the chip's cross clears it.
    <DropdownMenuRadioGroup
      onValueChange={(id: string) => props.onChange(field, [id])}
      value={selected[0] ?? ""}
    >
      {ids.map((id) => (
        <DropdownMenuRadioItem closeOnClick key={id} value={id}>
          {labels.get(id)}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

// A line of chips for the filters in use, above the list. It wraps on wider screens and scrolls
// sideways on phones, staying one line tall. With several active, Clear removes them all, along
// with the search.
export function ActiveRecipeFilters({ onClear, ...props }: FilterProps & { onClear: () => void }) {
  const activeFields = recipeFilterFields.filter(
    (field) => (props.filters[field]?.length ?? 0) > 0,
  );
  const favorites = props.filters.favorites === true;
  const activeCount = activeFields.length + (favorites ? 1 : 0);
  if (activeCount === 0) return null;

  return (
    // Sits on the page above the list, lined up with its content; the chips scroll right to the
    // screen's edges.
    <div className="-mx-2 flex shrink-0 items-center gap-2 overflow-x-auto px-5 py-1 sm:flex-wrap lg:-mx-3 lg:px-6 lg:pt-0">
      {activeFields.map((field) => (
        <FilterChip {...props} field={field} key={field} />
      ))}
      {favorites && (
        <Badge className="h-7 gap-1 p-1 pl-2.5">
          Favorites
          <Button
            aria-label="Clear favorites filter"
            className="size-5 rounded-full"
            onClick={() => props.onFavoritesChange(false)}
            size="icon-sm"
            variant="ghost"
          >
            <Cancel01Icon />
          </Button>
        </Badge>
      )}
      {activeCount > 1 && (
        <Button className="-mr-2 ml-auto shrink-0" onClick={onClear} size="sm" variant="ghost">
          Clear
        </Button>
      )}
    </div>
  );
}

// Opens straight at the field's values.
function FilterChip({ field, ...props }: FilterProps & { field: RecipeFilterField }) {
  const { label, unknown } = fields[field];
  const [first, ...rest] = props.filters[field] ?? [];
  // A shared link may name a tag or member this device has not loaded yet.
  const firstName = (first !== undefined && getValueLabels(field, props).get(first)) || unknown;
  const summary = `${label}: ${firstName}${rest.length > 0 ? ` +${rest.length}` : ""}`;

  return (
    <Badge className="h-7 gap-1 p-1 pl-2.5">
      <DropdownMenuFilter autoHighlight="always">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Edit filter, ${summary}`}
            className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {summary}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" {...valuesContentProps(field)}>
            <FilterValues {...props} field={field} />
          </DropdownMenuContent>
        </DropdownMenu>
      </DropdownMenuFilter>
      <Button
        aria-label={`Clear ${label.toLowerCase()} filter`}
        className="size-5 rounded-full"
        onClick={() => props.onChange(field, [])}
        size="icon-sm"
        variant="ghost"
      >
        <Cancel01Icon />
      </Button>
    </Badge>
  );
}

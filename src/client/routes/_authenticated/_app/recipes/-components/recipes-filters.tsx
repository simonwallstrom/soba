import { Badge } from "@client/components/ui/badge";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Combobox,
  ComboboxCheckboxItem,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@client/components/ui/combobox";
import {
  ArrowLeftIcon,
  Cancel01Icon,
  FilterIcon,
  Tag01Icon,
  UserCircle02Icon,
} from "@client/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@client/components/ui/popover";
import type { HouseholdMember } from "@client/features/household/members";
import type { Tag } from "@shared/recipes";
import { cn } from "cn";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";

import { hasRecipeFilters, recipeFilterFields } from "../-recipe-list";
import type { RecipeFilterField, RecipeFilters } from "../-recipe-list";

type FieldOption = {
  value: RecipeFilterField;
  label: string;
  plural: string;
  unknown: string;
  Icon: typeof Tag01Icon;
};

const fields: Record<RecipeFilterField, FieldOption> = {
  tags: { value: "tags", label: "Tag", plural: "tags", unknown: "Unknown tag", Icon: Tag01Icon },
  authors: {
    value: "authors",
    label: "Added by",
    plural: "members",
    unknown: "Unknown member",
    Icon: UserCircle02Icon,
  },
};

const fieldOptions = recipeFilterFields.map((field) => fields[field]);

type FilterProps = {
  // The household's tags and members, sorted by name.
  tags: readonly Tag[];
  members: readonly HouseholdMember[];
  filters: RecipeFilters;
  onChange: (field: RecipeFilterField, ids: string[]) => void;
};

type InputRef = RefObject<HTMLInputElement | null>;

// Each step focuses its search when it appears, including after switching steps, and
// highlights the first item so Enter works before typing. Combobox has no prop for that yet.
// The flag keeps Strict Mode's second effect run from moving the highlight down again.
function useFocusOnMount(inputRef: InputRef) {
  const hasHighlighted = useRef(false);
  useEffect(() => {
    const input = inputRef.current;
    input?.focus();
    if (hasHighlighted.current) return;
    hasHighlighted.current = true;
    input?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  }, [inputRef]);
}

function getValueLabels(field: RecipeFilterField, { tags, members }: FilterProps) {
  const values = field === "tags" ? tags : members;
  return new Map(values.map((value) => [value.id, value.name]));
}

// Picks a field first, then its values, so only one searchable list is ever open.
export function RecipesFilter(props: FilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<RecipeFilterField | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isActive = hasRecipeFilters(props.filters);

  return (
    <Popover
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setStep(null);
      }}
      open={isOpen}
    >
      <PopoverTrigger
        aria-label={isActive ? "Filter recipes, filters applied" : "Filter recipes"}
        className={buttonVariants({ className: "relative", size: "icon", variant: "ghost" })}
      >
        <FilterIcon />
        {isActive && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 size-2 rounded-full border border-olive-50 bg-olive-800 dark:border-olive-925 dark:bg-olive-200"
          />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0" initialFocus={inputRef}>
        {step === null ? (
          <FieldStep inputRef={inputRef} onSelect={setStep} />
        ) : (
          <ValueStep {...props} field={step} inputRef={inputRef} onBack={() => setStep(null)} />
        )}
      </PopoverContent>
    </Popover>
  );
}

function FieldStep({
  inputRef,
  onSelect,
}: {
  inputRef: InputRef;
  onSelect: (field: RecipeFilterField) => void;
}) {
  useFocusOnMount(inputRef);

  return (
    // Highlights the first match while typing, so Enter moves on to it.
    <Combobox
      autoHighlight
      inline
      itemToStringLabel={(option: FieldOption) => option.label}
      items={fieldOptions}
      onValueChange={(option: FieldOption | null) => option && onSelect(option.value)}
      open
      value={null}
    >
      <ComboboxInput placeholder="Filter by…" ref={inputRef} showTrigger={false} variant="popup" />
      <ComboboxEmpty>No filters found.</ComboboxEmpty>
      <ComboboxList>
        {(option: FieldOption) => (
          <ComboboxItem key={option.value} value={option}>
            <span className="flex items-center gap-2">
              <option.Icon className="text-olive-500" />
              {option.label}
            </span>
          </ComboboxItem>
        )}
      </ComboboxList>
    </Combobox>
  );
}

function ValueStep({
  field,
  inputRef,
  onBack,
  ...props
}: FilterProps & { field: RecipeFilterField; inputRef: InputRef; onBack?: () => void }) {
  useFocusOnMount(inputRef);
  const { label, plural } = fields[field];
  const labels = getValueLabels(field, props);
  // Selected values move to the top when the step opens, but stay put while you pick.
  const [pinned] = useState(() => new Set(props.filters[field]));
  const order = [...labels.keys()];
  const items = [...order.filter((id) => pinned.has(id)), ...order.filter((id) => !pinned.has(id))];

  // Backspace in an empty search goes back to the fields.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (onBack && event.key === "Backspace" && event.currentTarget.value === "") onBack();
  }

  return (
    <Combobox
      autoHighlight
      inline
      itemToStringLabel={(id: string) => labels.get(id) ?? ""}
      items={items}
      multiple
      onValueChange={(ids: string[]) => props.onChange(field, ids)}
      open
      value={props.filters[field] ?? []}
    >
      <div className="flex items-center border-b-[0.5px] border-black/15 dark:border-white/15">
        {/* Centred on the checkbox column below, with the search text over the item labels. */}
        {onBack && (
          <Button
            aria-label="Back to filters"
            className="ml-2.25 size-7 shrink-0 rounded-md [&_svg]:size-3.5"
            onClick={onBack}
            size="icon-sm"
            variant="ghost"
          >
            <ArrowLeftIcon />
          </Button>
        )}
        <ComboboxInput
          aria-label={`Filter by ${label.toLowerCase()}`}
          className={cn("border-b-0", onBack && "[&_input]:pl-0.75")}
          onKeyDown={handleKeyDown}
          placeholder={`Search ${plural}…`}
          ref={inputRef}
          showTrigger={false}
          variant="popup"
        />
      </div>
      <ComboboxEmpty>No {plural} found.</ComboboxEmpty>
      <ComboboxList className="max-h-80">
        {(id: string) => (
          <ComboboxCheckboxItem key={id} value={id}>
            {labels.get(id)}
          </ComboboxCheckboxItem>
        )}
      </ComboboxList>
    </Combobox>
  );
}

// With several filters active, Clear removes them all, along with the search.
export function ActiveRecipeFilters({ onClear, ...props }: FilterProps & { onClear: () => void }) {
  const activeFields = recipeFilterFields.filter(
    (field) => (props.filters[field]?.length ?? 0) > 0,
  );
  if (activeFields.length === 0) return null;

  return (
    <section
      aria-label="Active recipe filters"
      className="sticky top-0 z-20 overflow-x-auto border-b-[0.5px] border-black/18 bg-olive-100 dark:border-white/10 dark:bg-olive-900"
    >
      <div className="flex min-w-max items-center gap-2 px-5 py-2 lg:px-6">
        {activeFields.map((field) => (
          <FilterChip {...props} field={field} key={field} />
        ))}
        {activeFields.length > 1 && (
          <Button className="ml-auto" onClick={onClear} size="sm" variant="ghost">
            Clear
          </Button>
        )}
      </div>
    </section>
  );
}

// Opens straight at the field's values.
function FilterChip({ field, ...props }: FilterProps & { field: RecipeFilterField }) {
  const { label, unknown } = fields[field];
  const [first, ...rest] = props.filters[field] ?? [];
  // A shared link may name a tag or member this device has not loaded yet.
  const firstName = (first !== undefined && getValueLabels(field, props).get(first)) || unknown;
  const summary = `${label}: ${firstName}${rest.length > 0 ? ` +${rest.length}` : ""}`;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Badge className="h-7 gap-1 p-1 pl-2.5">
      <Popover>
        <PopoverTrigger
          aria-label={`Edit filter, ${summary}`}
          className="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {summary}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0" initialFocus={inputRef}>
          <ValueStep {...props} field={field} inputRef={inputRef} />
        </PopoverContent>
      </Popover>
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

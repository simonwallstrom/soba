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
import { Drawer, DrawerContent, DrawerTrigger } from "@client/components/ui/drawer";
import {
  ArrowLeftIcon,
  Cancel01Icon,
  FilterIcon,
  HashtagIcon,
  UserCircle02Icon,
} from "@client/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@client/components/ui/popover";
import type { HouseholdMember } from "@client/features/household/members";
import { useIsMobile } from "@client/lib/media";
import type { Tag } from "@shared/recipes";
import { cn } from "cn";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps, KeyboardEvent, ReactNode, RefObject } from "react";

import { recipeFilterFields } from "../-recipe-list";
import type { RecipeFilterField, RecipeFilters } from "../-recipe-list";

type FieldOption = {
  value: RecipeFilterField;
  label: string;
  plural: string;
  unknown: string;
  Icon: typeof HashtagIcon;
};

const fields: Record<RecipeFilterField, FieldOption> = {
  tags: { value: "tags", label: "Tag", plural: "tags", unknown: "Unknown tag", Icon: HashtagIcon },
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
// Phones skip this, since the keyboard would cover the list before anyone asked to type.
function useFocusOnMount(inputRef: InputRef) {
  const isMobile = useIsMobile();
  const hasHighlighted = useRef(false);
  useEffect(() => {
    if (isMobile) return;
    const input = inputRef.current;
    input?.focus();
    if (hasHighlighted.current) return;
    hasHighlighted.current = true;
    input?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  }, [inputRef, isMobile]);
}

// Anchored to its trigger, or a drawer on phones, where the lists need room.
function FilterPopup({
  align,
  children,
  inputRef,
  label,
  onOpenChange,
  open,
  trigger,
}: {
  align: "start" | "end";
  children: ReactNode;
  inputRef: InputRef;
  // Names the drawer, which has no visible title.
  label: string;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  trigger: ComponentProps<"button">;
}) {
  const isMobile = useIsMobile();
  // The drawer focuses itself rather than the search, so the keyboard stays down.
  const drawerRef = useRef<HTMLDivElement>(null);

  if (isMobile) {
    return (
      <Drawer onOpenChange={onOpenChange} open={open}>
        <DrawerTrigger {...trigger} />
        <DrawerContent
          aria-label={label}
          // The search row starts at the top, with the close button at its end. The list scrolls
          // to the bottom edge, so only the bleed and safe area pad it.
          className="gap-0 px-0 pt-0 pb-[calc(3rem+env(safe-area-inset-bottom))]"
          initialFocus={drawerRef}
          ref={drawerRef}
        >
          {children}
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <PopoverTrigger {...trigger} />
      <PopoverContent align={align} className="w-64 p-0" initialFocus={inputRef}>
        {children}
      </PopoverContent>
    </Popover>
  );
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

  return (
    <FilterPopup
      align="end"
      inputRef={inputRef}
      label="Filter recipes"
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setStep(null);
      }}
      open={isOpen}
      trigger={{
        "aria-label": "Filter recipes",
        className: buttonVariants({ size: "icon", variant: "ghost" }),
        title: "Filter",
        children: <FilterIcon />,
      }}
    >
      {step === null ? (
        <FieldStep inputRef={inputRef} onSelect={setStep} />
      ) : (
        <ValueStep {...props} field={step} inputRef={inputRef} onBack={() => setStep(null)} />
      )}
    </FilterPopup>
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
      {/* On phones, the search and icons line up with the page's 20px margin, and the row
          is as tall as the app's bars, leaving room for the drawer's close button. */}
      <ComboboxInput
        className="max-sm:[&_input]:h-12 max-sm:[&_input]:px-5 max-sm:[&_input]:pr-14"
        placeholder="Filter by…"
        ref={inputRef}
        showTrigger={false}
        variant="popup"
      />
      <ComboboxEmpty>No filters found.</ComboboxEmpty>
      <ComboboxList className="max-sm:p-2.5">
        {(option: FieldOption) => (
          <ComboboxItem key={option.value} value={option}>
            <span className="flex items-center gap-2">
              <option.Icon />
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
        {/* Centred on the checkbox column below, with the search text over the item labels.
            Phones pad the list to the page's 20px margin, so the button moves with it. */}
        {onBack && (
          <Button
            aria-label="Back to filters"
            className="ml-2.25 size-7 shrink-0 max-sm:ml-3.75 [&_svg]:size-3.5"
            onClick={onBack}
            size="icon-sm"
            variant="ghost"
          >
            <ArrowLeftIcon />
          </Button>
        )}
        <ComboboxInput
          aria-label={`Filter by ${label.toLowerCase()}`}
          className={cn(
            "border-b-0 max-sm:[&_input]:h-12 max-sm:[&_input]:pr-14",
            onBack && "[&_input]:pl-0.75",
          )}
          onKeyDown={handleKeyDown}
          placeholder={`Search ${plural}…`}
          ref={inputRef}
          showTrigger={false}
          variant="popup"
        />
      </div>
      <ComboboxEmpty>No {plural} found.</ComboboxEmpty>
      <ComboboxList className="max-h-80 max-sm:max-h-[60dvh] max-sm:p-2.5">
        {(id: string) => (
          <ComboboxCheckboxItem key={id} value={id}>
            {labels.get(id)}
          </ComboboxCheckboxItem>
        )}
      </ComboboxList>
    </Combobox>
  );
}

// A line of chips for the filters in use, under the search. A fainter, inset line keeps it part
// of the same bar. It wraps on wider screens and scrolls sideways on phones, staying one line
// tall. With several active, Clear removes them all, along with the search.
export function ActiveRecipeFilters({ onClear, ...props }: FilterProps & { onClear: () => void }) {
  const activeFields = recipeFilterFields.filter(
    (field) => (props.filters[field]?.length ?? 0) > 0,
  );
  if (activeFields.length === 0) return null;

  return (
    // The line is inset to the content's edges, while the chips scroll right to the screen's.
    <div className="relative before:absolute before:inset-x-5 before:top-0 before:border-t-[0.5px] before:border-black/8 lg:before:inset-x-6 dark:before:border-white/6">
      <div className="flex items-center gap-2 overflow-x-auto px-5 py-2 sm:flex-wrap lg:px-6">
        {activeFields.map((field) => (
          <FilterChip {...props} field={field} key={field} />
        ))}
        {activeFields.length > 1 && (
          <Button className="-mr-2 ml-auto shrink-0" onClick={onClear} size="sm" variant="ghost">
            Clear
          </Button>
        )}
      </div>
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
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Badge className="h-7 gap-1 p-1 pl-2.5">
      <FilterPopup
        align="start"
        inputRef={inputRef}
        label={`Filter by ${label.toLowerCase()}`}
        trigger={{
          "aria-label": `Edit filter, ${summary}`,
          className:
            "rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
          children: summary,
        }}
      >
        <ValueStep {...props} field={field} inputRef={inputRef} />
      </FilterPopup>
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

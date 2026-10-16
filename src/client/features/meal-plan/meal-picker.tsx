import {
  CommandPaletteContent,
  CommandPaletteContext,
  CommandPaletteFooter,
  CommandPaletteHint,
  CommandPaletteInput,
  CommandPaletteList,
} from "@client/components/particles/command-palette";
import { Button } from "@client/components/ui/button";
import {
  Combobox,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
} from "@client/components/ui/combobox";
import { Dialog, DialogClose } from "@client/components/ui/dialog";
import { HashtagIcon, ServingFoodIcon } from "@client/components/ui/icons";
import { ImagePlaceholder, ImageThumbnail } from "@client/components/ui/image-thumbnail";
import { usePlannedMeals } from "@client/features/meal-plan/meal-plan-data";
import { dayKey } from "@client/features/meal-plan/weeks";
import type { RecipeListEntry } from "@client/features/recipes/recipe-list";
import { compareNames } from "@client/features/recipes/recipe-tags";
import { mealHistory } from "@shared/meal-plan";
import { useState } from "react";

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const plannedFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const agoFormat = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

// Recipes last eaten at least this many days ago, and not planned again, come first.
const aWhile = 21;

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

// "Yesterday", "5 days ago", "3 weeks ago", "2 months ago".
function formatAgo(date: string, today: string) {
  const days = daysBetween(date, today);
  if (days < 14) return agoFormat.format(-days, "day");
  if (days < 60) return agoFormat.format(-Math.floor(days / 7), "week");
  return agoFormat.format(-Math.floor(days / 30), "month");
}

type RecipeGroup = { value: string; items: string[] };

// Finds a recipe for one day: type to search, pick one, and the palette closes with it planned.
// It keeps showing its day while it closes, so the caller holds on to `date` after `open` drops.
export function MealPicker({
  date,
  entries,
  onOpenChange,
  onPick,
  open,
}: {
  date: Date | undefined;
  entries: readonly RecipeListEntry[];
  onOpenChange: (open: boolean) => void;
  onPick: (recipeId: string) => void;
  open: boolean;
}) {
  const dayLabel = date ? dayFormat.format(date) : "";
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <CommandPaletteContent aria-label={`Choose a recipe for ${dayLabel}`}>
        <RecipeSearch
          dayLabel={dayLabel}
          entries={entries}
          onPick={(recipeId) => {
            onPick(recipeId);
            onOpenChange(false);
          }}
        />
      </CommandPaletteContent>
    </Dialog>
  );
}

function normalize(text: string) {
  return text.trim().toLocaleLowerCase("sv");
}

// Before typing, recipes the household hasn't had in a while come first, longest ago first, so
// the list doubles as ideas; the rest follow by name. Typing searches them all: recipes whose
// title matches first, then those that only match by tag, which name the tag so it's clear why
// they're there. Each row says when the recipe was last eaten, or when it's planned next.
function RecipeSearch({
  dayLabel,
  entries,
  onPick,
}: {
  dayLabel: string;
  entries: readonly RecipeListEntry[];
  onPick: (recipeId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const today = dayKey(new Date());
  const { lastEaten, nextPlanned } = mealHistory(usePlannedMeals(), today);
  const byId = new Map(entries.map((entry) => [entry.recipe.id, entry]));
  const sorted = entries.toSorted((left, right) =>
    compareNames(left.recipe.title, right.recipe.title),
  );
  const needle = normalize(query);
  const matchedTags = new Map<string, string>();
  const groups: RecipeGroup[] = [];
  if (needle) {
    const titleMatches: string[] = [];
    const tagMatches: string[] = [];
    for (const { recipe, tags } of sorted) {
      if (normalize(recipe.title).includes(needle)) {
        titleMatches.push(recipe.id);
        continue;
      }
      const tag = tags.find((candidate) => normalize(candidate.name).includes(needle));
      if (!tag) continue;
      matchedTags.set(recipe.id, tag.name);
      tagMatches.push(recipe.id);
    }
    groups.push({ value: "Recipes", items: [...titleMatches, ...tagMatches] });
  } else {
    const isDue = (id: string) => {
      const eaten = lastEaten.get(id);
      return eaten !== undefined && !nextPlanned.has(id) && daysBetween(eaten, today) >= aWhile;
    };
    const due = sorted
      .map(({ recipe }) => recipe.id)
      .filter(isDue)
      .toSorted((left, right) =>
        (lastEaten.get(left) ?? "").localeCompare(lastEaten.get(right) ?? ""),
      );
    groups.push(
      { value: "Not had in a while", items: due },
      {
        value: "All recipes",
        items: sorted.map(({ recipe }) => recipe.id).filter((id) => !isDue(id)),
      },
    );
  }
  const shown = groups.filter((group) => group.items.length > 0);

  function when(id: string) {
    const planned = nextPlanned.get(id);
    if (planned) return `Planned ${plannedFormat.format(new Date(`${planned}T00:00`))}`;
    const eaten = lastEaten.get(id);
    return eaten ? formatAgo(eaten, today) : undefined;
  }

  return (
    <Combobox
      autoHighlight
      inline
      // The list is matched above, so the combobox shows it as is.
      filter={null}
      inputValue={query}
      itemToStringLabel={(id: string) => byId.get(id)?.recipe.title ?? ""}
      items={shown}
      onInputValueChange={setQuery}
      onValueChange={(id: string | null) => {
        if (id) onPick(id);
      }}
      open
      value={null}
    >
      <CommandPaletteContext label="Plan for">{dayLabel}</CommandPaletteContext>
      <CommandPaletteInput placeholder="Find a recipe or tag…" />
      <ComboboxEmpty>No recipes found.</ComboboxEmpty>
      <CommandPaletteList>
        {(group: RecipeGroup) => (
          <ComboboxGroup items={group.items} key={group.value}>
            {/* One group needs no heading. */}
            {shown.length > 1 && <ComboboxLabel>{group.value}</ComboboxLabel>}
            <ComboboxCollection>
              {(id: string) => {
                const entry = byId.get(id);
                if (!entry) return null;
                const { recipe } = entry;
                const matchedTag = matchedTags.get(id);
                return (
                  // The item's own wrapper fills the row, so the date sits at its end.
                  <ComboboxItem className="[&>span:first-child]:flex-1" key={id} value={id}>
                    <span className="flex w-full min-w-0 items-center gap-3">
                      {recipe.imageUrl ? (
                        <ImageThumbnail
                          className="h-8 w-9 shrink-0 rounded-md"
                          height={64}
                          src={recipe.imageUrl}
                          width={72}
                        />
                      ) : (
                        <ImagePlaceholder className="h-8 w-9 shrink-0 rounded-md [&_svg]:size-4">
                          <ServingFoodIcon />
                        </ImagePlaceholder>
                      )}
                      <span className="truncate">{recipe.title}</span>
                      {matchedTag && (
                        <span className="flex shrink-0 items-center gap-0.5 text-olive-500">
                          <HashtagIcon className="size-3.5" />
                          {matchedTag}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 pl-2 text-sm text-olive-500 first-letter:uppercase">
                        {when(id)}
                      </span>
                    </span>
                  </ComboboxItem>
                );
              }}
            </ComboboxCollection>
          </ComboboxGroup>
        )}
      </CommandPaletteList>
      <CommandPaletteFooter>
        <CommandPaletteHint keys={["↵"]}>Plan</CommandPaletteHint>
        <DialogClose render={<Button size="sm" variant="ghost" />}>
          <CommandPaletteHint keys={["esc"]}>Close</CommandPaletteHint>
        </DialogClose>
      </CommandPaletteFooter>
    </Combobox>
  );
}

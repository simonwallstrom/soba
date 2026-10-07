import {
  CommandPaletteContent,
  CommandPaletteContext,
  CommandPaletteFooter,
  CommandPaletteHint,
  CommandPaletteInput,
  CommandPaletteList,
} from "@client/components/particles/command-palette";
import { Button } from "@client/components/ui/button";
import { Combobox, ComboboxEmpty, ComboboxItem } from "@client/components/ui/combobox";
import { Dialog, DialogClose } from "@client/components/ui/dialog";
import { HashtagIcon, ServingFoodIcon } from "@client/components/ui/icons";
import { ImagePlaceholder, ImageThumbnail } from "@client/components/ui/image-thumbnail";
import type { RecipeListEntry } from "@client/features/recipes/recipe-list";
import { compareNames } from "@client/features/recipes/recipe-tags";
import { useState } from "react";

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

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

// Recipes whose title matches come first, then those that only match by tag; those rows name the
// tag, so it's clear why they're there.
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
  const byId = new Map(entries.map((entry) => [entry.recipe.id, entry]));
  const sorted = entries.toSorted((left, right) =>
    compareNames(left.recipe.title, right.recipe.title),
  );
  const needle = normalize(query);
  const matchedTags = new Map<string, string>();
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

  return (
    <Combobox
      autoHighlight
      inline
      // The list is matched above, so the combobox shows it as is.
      filter={null}
      inputValue={query}
      itemToStringLabel={(id: string) => byId.get(id)?.recipe.title ?? ""}
      items={[...titleMatches, ...tagMatches]}
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
        {(id: string) => {
          const entry = byId.get(id);
          if (!entry) return null;
          const { recipe } = entry;
          const matchedTag = matchedTags.get(id);
          return (
            <ComboboxItem key={id} value={id}>
              <span className="flex min-w-0 items-center gap-3">
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
              </span>
            </ComboboxItem>
          );
        }}
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

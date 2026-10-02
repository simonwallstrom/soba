import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import {
  CommandPaletteContent,
  CommandPaletteFooter,
  CommandPaletteHint,
  CommandPaletteInput,
  CommandPaletteList,
} from "@client/components/particles/command-palette";
import { Combobox, ComboboxEmpty, ComboboxItem } from "@client/components/ui/combobox";
import { Dialog } from "@client/components/ui/dialog";
import { Search01Icon, ServingFoodIcon } from "@client/components/ui/icons";
import { ImagePlaceholder, ImageThumbnail } from "@client/components/ui/image-thumbnail";
import { householdStoreReady, useHouseholdQuery } from "@client/features/household/store";
import { recipes$ } from "@client/features/recipes/queries";
import { compareNames } from "@client/features/recipes/recipe-tags";
import type { Recipe } from "@shared/recipes";
import { useNavigate } from "@tanstack/react-router";
import { Suspense, use, useState } from "react";

// The last row while typing: shows the recipe list filtered by the text instead.
const showAllResults = { id: "show-all-results" } as const;
type SearchItem = Recipe | typeof showAllResults;

function isShowAllResults(item: SearchItem): item is typeof showAllResults {
  return item === showAllResults;
}

// Finds a recipe by title and opens it, or lists every recipe that mentions the text.
export function RecipeSearch({
  householdId,
  onOpenChange,
  open,
}: {
  householdId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      {/* Searching is the point, so phones focus the field and show the keyboard right away. */}
      <CommandPaletteContent aria-label="Search recipes" initialFocus>
        {/* The app shell can open search before the household store has. */}
        <Suspense fallback={null}>
          <RecipeResults householdId={householdId} onOpen={() => onOpenChange(false)} />
        </Suspense>
      </CommandPaletteContent>
    </Dialog>
  );
}

function RecipeResults({ householdId, onOpen }: { householdId: string; onOpen: () => void }) {
  use(householdStoreReady(householdId));
  const navigate = useNavigate();
  const filter = ComboboxPrimitive.useFilter();
  const [query, setQuery] = useState("");
  const recipes = useHouseholdQuery(householdId, recipes$).toSorted((left, right) =>
    compareNames(left.title, right.title),
  );
  const items: SearchItem[] = query.trim() === "" ? recipes : [...recipes, showAllResults];

  function itemToString(item: SearchItem) {
    return isShowAllResults(item) ? query : item.title;
  }

  return (
    <Combobox
      autoHighlight
      // Titles match as you type; the list page also searches descriptions, tags, and ingredients.
      filter={(item: SearchItem, text) =>
        isShowAllResults(item) || filter.contains(item, text, itemToString)
      }
      inline
      inputValue={query}
      itemToStringLabel={itemToString}
      items={items}
      onInputValueChange={setQuery}
      onValueChange={(item: SearchItem | null) => {
        if (!item) return;
        onOpen();
        if (isShowAllResults(item)) {
          // Keeps any filters already on the list, so text narrows them further.
          void navigate({ to: "/recipes", search: (current) => ({ ...current, q: query.trim() }) });
        } else {
          void navigate({ to: "/recipes/$recipeId", params: { recipeId: item.id } });
        }
      }}
      open
      value={null}
    >
      <CommandPaletteInput placeholder="Search recipes…" />
      <ComboboxEmpty>No recipes found.</ComboboxEmpty>
      {/* Rows pad their thumbnails evenly on every side. */}
      <CommandPaletteList>
        {(item: SearchItem) =>
          isShowAllResults(item) ? (
            <ComboboxItem className="py-2.5" key={item.id} value={item}>
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-9 shrink-0 items-center justify-center text-olive-500">
                  <Search01Icon />
                </span>
                <span className="truncate">Show all results for “{query.trim()}”</span>
              </span>
            </ComboboxItem>
          ) : (
            <ComboboxItem className="py-2.5" key={item.id} value={item}>
              <span className="flex min-w-0 items-center gap-3">
                {item.imageUrl ? (
                  <ImageThumbnail
                    className="h-8 w-9 shrink-0 rounded-md"
                    height={64}
                    src={item.imageUrl}
                    width={72}
                  />
                ) : (
                  <ImagePlaceholder className="h-8 w-9 shrink-0 rounded-md [&_svg]:size-4">
                    <ServingFoodIcon />
                  </ImagePlaceholder>
                )}
                <span className="truncate">{item.title}</span>
              </span>
            </ComboboxItem>
          )
        }
      </CommandPaletteList>
      <CommandPaletteFooter>
        <CommandPaletteHint keys={["↵"]}>Open</CommandPaletteHint>
        <CommandPaletteHint keys={["esc"]}>Close</CommandPaletteHint>
      </CommandPaletteFooter>
    </Combobox>
  );
}

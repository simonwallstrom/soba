import {
  CommandPaletteContent,
  CommandPaletteFooter,
  CommandPaletteHint,
  CommandPaletteInput,
  CommandPaletteList,
} from "@client/components/particles/command-palette";
import { Combobox, ComboboxEmpty, ComboboxItem } from "@client/components/ui/combobox";
import { Dialog } from "@client/components/ui/dialog";
import { ServingFoodIcon } from "@client/components/ui/icons";
import { ImagePlaceholder, ImageThumbnail } from "@client/components/ui/image-thumbnail";
import { householdStoreReady, useHouseholdQuery } from "@client/features/household/store";
import { recipes$ } from "@client/features/recipes/queries";
import { compareNames } from "@client/features/recipes/recipe-tags";
import type { Recipe } from "@shared/recipes";
import { useNavigate } from "@tanstack/react-router";
import { Suspense, use } from "react";

// Finds a recipe by title and opens it.
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
  const recipes = useHouseholdQuery(householdId, recipes$).toSorted((left, right) =>
    compareNames(left.title, right.title),
  );

  return (
    <Combobox
      autoHighlight
      inline
      itemToStringLabel={(recipe: Recipe) => recipe.title}
      items={recipes}
      onValueChange={(recipe: Recipe | null) => {
        if (!recipe) return;
        onOpen();
        void navigate({ to: "/recipes/$recipeId", params: { recipeId: recipe.id } });
      }}
      open
      value={null}
    >
      <CommandPaletteInput placeholder="Search recipes…" />
      <ComboboxEmpty>No recipes found.</ComboboxEmpty>
      <CommandPaletteList>
        {(recipe: Recipe) => (
          <ComboboxItem key={recipe.id} value={recipe}>
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
            </span>
          </ComboboxItem>
        )}
      </CommandPaletteList>
      <CommandPaletteFooter>
        <CommandPaletteHint keys={["↵"]}>Open</CommandPaletteHint>
        <CommandPaletteHint keys={["esc"]}>Close</CommandPaletteHint>
      </CommandPaletteFooter>
    </Combobox>
  );
}

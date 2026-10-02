import { Button } from "@client/components/ui/button";
import { Checkbox } from "@client/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { Add01Icon } from "@client/components/ui/icons";
import { CollectionDialog } from "@client/features/collections/collection-dialog";
import { groupRecipesByCollection } from "@client/features/collections/collection-recipes";
import {
  createCollection,
  formatRecipeCount,
} from "@client/features/collections/collection-values";
import { collectionRecipes$, collections$ } from "@client/features/collections/queries";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { recipes$ } from "@client/features/recipes/queries";
import { compareNames } from "@client/features/recipes/recipe-tags";
import { recipeAddedToCollection, recipeRemovedFromCollection } from "@shared/recipes";
import type { Recipe } from "@shared/recipes";
import { useState } from "react";

type CollectingRecipe = Pick<Recipe, "id" | "title">;

// Opens the dialog for a recipe. The recipe stays set while the dialog animates closed.
export function useAddToCollectionDialog() {
  const [state, setState] = useState<{ recipe: CollectingRecipe; open: boolean } | null>(null);
  return {
    openFor: (recipe: CollectingRecipe) => setState({ recipe, open: true }),
    dialogProps: {
      recipe: state?.recipe ?? null,
      open: state?.open ?? false,
      onOpenChange: (open: boolean) => setState((current) => current && { ...current, open }),
    },
  };
}

// Checking a collection adds the recipe right away, and unchecking removes it.
export function AddToCollectionDialog({
  householdId,
  onOpenChange,
  open,
  recipe,
  userId,
}: {
  householdId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  recipe: CollectingRecipe | null;
  userId: string;
}) {
  const store = useHouseholdStore(householdId);
  const collections = useHouseholdQuery(householdId, collections$);
  const links = useHouseholdQuery(householdId, collectionRecipes$);
  const recipes = useHouseholdQuery(householdId, recipes$);
  const [isCreating, setIsCreating] = useState(false);

  const recipesByCollection = groupRecipesByCollection(links, recipes);
  const sortedCollections = collections.toSorted((left, right) =>
    compareNames(left.title, right.title),
  );

  function setIncluded(collectionId: string, recipeId: string, included: boolean) {
    const at = new Date();
    store.commit(
      included
        ? recipeAddedToCollection({ collectionId, recipeId, addedBy: userId, addedAt: at })
        : recipeRemovedFromCollection({ collectionId, recipeId, removedBy: userId, removedAt: at }),
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to collection</DialogTitle>
          <DialogDescription>{recipe?.title}</DialogDescription>
        </DialogHeader>
        {sortedCollections.length === 0 ? (
          <p className="text-olive-500">No collections yet. Create one to add this recipe.</p>
        ) : (
          <DialogBody>
            <div className="-mx-2 flex flex-col">
              {sortedCollections.map((collection) => {
                const collectionRecipes = recipesByCollection.get(collection.id) ?? [];
                return (
                  // The label makes the whole row toggle the checkbox.
                  <label
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-black/5 dark:hover:bg-white/6"
                    key={collection.id}
                  >
                    <Checkbox
                      checked={collectionRecipes.some(({ id }) => id === recipe?.id)}
                      onCheckedChange={(checked) =>
                        recipe && setIncluded(collection.id, recipe.id, checked)
                      }
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{collection.title}</span>
                    <span className="shrink-0 text-sm text-olive-500">
                      {formatRecipeCount(collectionRecipes.length)}
                    </span>
                  </label>
                );
              })}
            </div>
          </DialogBody>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="primary" />}>Done</DialogClose>
          <Button onClick={() => setIsCreating(true)}>
            <Add01Icon />
            New collection…
          </Button>
        </DialogFooter>
        {/* Nested inside the popup, so it stacks above this dialog. */}
        <CollectionDialog
          onOpenChange={setIsCreating}
          onSave={(values) => {
            if (!recipe) return;
            const id = crypto.randomUUID();
            const createdAt = new Date();
            store.commit(
              createCollection(values, { id, createdBy: userId, createdAt }),
              recipeAddedToCollection({
                collectionId: id,
                recipeId: recipe.id,
                addedBy: userId,
                addedAt: createdAt,
              }),
            );
          }}
          open={isCreating}
        />
      </DialogContent>
    </Dialog>
  );
}

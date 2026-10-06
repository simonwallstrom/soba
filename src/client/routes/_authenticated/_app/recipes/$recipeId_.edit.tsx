import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { Button, buttonVariants } from "@client/components/ui/button";
import { useMembersById } from "@client/features/household/members";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { recipe$, recipeTags$, tags$ } from "@client/features/recipes/queries";
import {
  hasDraftChanges,
  recipeEditEvents,
  recipeToDraft,
} from "@client/features/recipes/recipe-draft";
import { changesProfile, profileRecipe } from "@client/features/recipes/recipe-profile";
import { formatMetaTitle } from "@client/lib/meta";
import type { Recipe, Tag } from "@shared/recipes";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { RecipeForm, UnsavedChangesDialog, usePhotoSave } from "./-components/recipe-form";
import { RecipeNotFound } from "./-components/recipe-not-found";

export const Route = createFileRoute("/_authenticated/_app/recipes/$recipeId_/edit")({
  staticData: {
    breadcrumbs: [
      { label: "Recipes", link: { to: "/recipes" } },
      // Relative, as naming the recipe route here would make this route type itself.
      { label: RecipeTitle, link: { to: ".." } },
      { label: "Edit" },
    ],
  },
  component: EditRecipePage,
});

function useRecipe(): Recipe | undefined {
  const { household } = Route.useRouteContext();
  const { recipeId } = Route.useParams();
  return useHouseholdQuery(household.id, recipe$(recipeId));
}

function RecipeTitle(): string {
  return useRecipe()?.title ?? "Recipe";
}

function EditRecipePage() {
  const { household } = Route.useRouteContext();
  const recipe = useRecipe();
  const tags = useHouseholdQuery(household.id, tags$);
  const links = useHouseholdQuery(household.id, recipeTags$);

  // A wrong link, or a recipe deleted while open, perhaps on another device.
  if (!recipe) return <RecipeNotFound />;

  const tagIds = links.filter((link) => link.recipeId === recipe.id).map((link) => link.tagId);
  return <EditRecipe recipe={recipe} tagIds={tagIds} tags={tags} />;
}

// Starts from the recipe as it was when the page opened. Saving replaces it, so edits made
// meanwhile on another device are overwritten.
function EditRecipe({
  recipe,
  tagIds,
  tags,
}: {
  recipe: Recipe;
  tagIds: readonly string[];
  tags: readonly Tag[];
}) {
  const { household, user } = Route.useRouteContext();
  const navigate = useNavigate();
  const store = useHouseholdStore(household.id);
  const author = useMembersById()?.get(recipe.createdBy);
  const [original] = useState(() => recipeToDraft(recipe, tagIds));
  const [draft, setDraft] = useState(original);
  const photoSave = usePhotoSave();
  // Set once saved, so returning to the recipe does not ask about losing changes.
  const isSaved = useRef(false);

  async function save() {
    const meta = { id: recipe.id, updatedBy: user.id, updatedAt: new Date() };
    await photoSave.save(meta, (photoEvents) => {
      store.commit(...recipeEditEvents(draft, meta), ...photoEvents);
      const saved = store.query(recipe$(recipe.id));
      if (saved && changesProfile(recipe, saved)) void profileRecipe(store, recipe.id);
      isSaved.current = true;
      // Replaces this page, so going back does not reopen the editor.
      void navigate({ to: "/recipes/$recipeId", params: { recipeId: recipe.id }, replace: true });
    });
  }

  return (
    <>
      <title>{formatMetaTitle(`Edit ${recipe.title}`)}</title>
      <AppHeaderActions>
        <div className="-mr-2 flex items-center gap-1">
          <Link
            className={buttonVariants({ className: "max-lg:hidden", variant: "ghost" })}
            params={{ recipeId: recipe.id }}
            to="/recipes/$recipeId"
          >
            Cancel
          </Link>
          <Button disabled={photoSave.isSaving} form="edit-recipe" type="submit" variant="primary">
            {photoSave.isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </AppHeaderActions>
      <RecipeForm
        author={author}
        createdAt={recipe.createdAt}
        draft={draft}
        id="edit-recipe"
        imageUrl={recipe.imageUrl}
        onChange={setDraft}
        onPhotoChange={photoSave.changePhoto}
        onSave={() => void save()}
        photo={photoSave.photo}
        photoError={photoSave.error}
        sourceUrl={recipe.sourceUrl}
        tags={tags}
      />
      <UnsavedChangesDialog
        description="Your changes have not been saved and will be lost."
        isDirty={() =>
          !isSaved.current && (hasDraftChanges(draft, original) || photoSave.photo !== null)
        }
        title="Discard your changes?"
      />
    </>
  );
}

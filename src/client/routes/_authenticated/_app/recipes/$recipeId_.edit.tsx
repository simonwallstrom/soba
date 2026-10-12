import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { Button, buttonVariants } from "@client/components/ui/button";
import { useMembersById } from "@client/features/household/members";
import {
  updateRecipe,
  useRecipe as useRecipeById,
  useTags,
} from "@client/features/recipes/recipe-data";
import { draftFields, hasDraftChanges, recipeToDraft } from "@client/features/recipes/recipe-draft";
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
  const { recipeId } = Route.useParams();
  return useRecipeById(recipeId);
}

function RecipeTitle(): string {
  return useRecipe()?.title ?? "Recipe";
}

function EditRecipePage() {
  const recipe = useRecipe();
  const tags = useTags();

  // A wrong link, or a recipe deleted while open, perhaps on another device.
  if (!recipe) return <RecipeNotFound />;

  return <EditRecipe recipe={recipe} tags={tags} />;
}

// Starts from the recipe as it was when the page opened. Saving replaces it, so edits made
// meanwhile on another device are overwritten.
function EditRecipe({ recipe, tags }: { recipe: Recipe; tags: readonly Tag[] }) {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const author = useMembersById()?.get(recipe.createdBy);
  const [original] = useState(() => recipeToDraft(recipe));
  const [draft, setDraft] = useState(original);
  const photoSave = usePhotoSave();
  // Set once saved, so returning to the recipe does not ask about losing changes.
  const isSaved = useRef(false);

  async function save() {
    await photoSave.save((photoId) => {
      void updateRecipe(draftFields(draft), { id: recipe.id, userId: user.id, photoId });
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

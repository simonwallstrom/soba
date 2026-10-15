import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { Button, buttonVariants } from "@client/components/ui/button";
import { useMembersById } from "@client/features/household/members";
import { createRecipe, useTags } from "@client/features/recipes/recipe-data";
import {
  createRecipeDraft,
  draftFields,
  hasDraftContent,
} from "@client/features/recipes/recipe-draft";
import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { RecipeForm, UnsavedChangesDialog, usePhotoSave } from "./-components/recipe-form";

export const Route = createFileRoute("/_authenticated/_app/recipes/new")({
  staticData: {
    breadcrumbs: [{ label: "Recipes", link: { to: "/recipes" } }, { label: "New recipe" }],
  },
  component: NewRecipe,
});

function NewRecipe() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const author = useMembersById()?.get(user.id);
  const tags = useTags();
  const [createdAt] = useState(() => new Date());
  const [draft, setDraft] = useState(createRecipeDraft);
  const photoSave = usePhotoSave();
  // Set once saved, so leaving for the new recipe does not ask about losing it.
  const isSaved = useRef(false);

  async function save() {
    const id = crypto.randomUUID();
    await photoSave.save((photoId) => {
      void createRecipe(draftFields(draft), { id, userId: user.id, photoId: photoId ?? undefined });
      isSaved.current = true;
      // Replaces this page, so going back returns to the list rather than an empty form.
      void navigate({ to: "/recipes/$recipeId", params: { recipeId: id }, replace: true });
    });
  }

  return (
    <>
      <title>{formatMetaTitle("New recipe")}</title>
      <AppHeaderActions>
        <div className="-mr-2 flex items-center gap-2">
          <Link className={buttonVariants({ className: "max-lg:hidden" })} to="/recipes">
            Cancel
          </Link>
          <Button disabled={photoSave.isSaving} form="new-recipe" type="submit" variant="primary">
            {photoSave.isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </AppHeaderActions>
      <RecipeForm
        author={author}
        autoFocusTitle
        createdAt={createdAt}
        draft={draft}
        id="new-recipe"
        onChange={setDraft}
        onPhotoChange={photoSave.changePhoto}
        onSave={() => void save()}
        photo={photoSave.photo}
        photoError={photoSave.error}
        tags={tags}
      />
      <UnsavedChangesDialog
        description="It has not been saved, so what you wrote will be lost."
        isDirty={() => !isSaved.current && (hasDraftContent(draft) || photoSave.photo !== null)}
        title="Discard this recipe?"
      />
    </>
  );
}

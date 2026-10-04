import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { Button, buttonVariants } from "@client/components/ui/button";
import { useMembersById } from "@client/features/household/members";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { tags$ } from "@client/features/recipes/queries";
import {
  createRecipeDraft,
  hasDraftContent,
  recipeDraftEvents,
} from "@client/features/recipes/recipe-draft";
import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { RecipeForm, UnsavedChangesDialog } from "./-components/recipe-form";

export const Route = createFileRoute("/_authenticated/_app/recipes/new")({
  staticData: {
    breadcrumbs: [{ label: "Recipes", link: { to: "/recipes" } }, { label: "New recipe" }],
  },
  component: NewRecipe,
});

function NewRecipe() {
  const { household, user } = Route.useRouteContext();
  const navigate = useNavigate();
  const store = useHouseholdStore(household.id);
  const author = useMembersById()?.get(user.id);
  const tags = useHouseholdQuery(household.id, tags$);
  const [createdAt] = useState(() => new Date());
  const [draft, setDraft] = useState(createRecipeDraft);
  // Set once saved, so leaving for the new recipe does not ask about losing it.
  const isSaved = useRef(false);

  function save() {
    const id = crypto.randomUUID();
    store.commit(...recipeDraftEvents(draft, { id, createdBy: user.id, createdAt: new Date() }));
    isSaved.current = true;
    // Replaces this page, so going back returns to the list rather than an empty form.
    void navigate({ to: "/recipes/$recipeId", params: { recipeId: id }, replace: true });
  }

  return (
    <>
      <title>{formatMetaTitle("New recipe")}</title>
      <AppHeaderActions>
        <div className="-mr-2 flex items-center gap-1">
          <Link
            className={buttonVariants({ className: "max-lg:hidden", variant: "ghost" })}
            to="/recipes"
          >
            Cancel
          </Link>
          <Button form="new-recipe" type="submit" variant="primary">
            Save
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
        onSave={save}
        tags={tags}
      />
      <UnsavedChangesDialog
        description="It has not been saved, so what you wrote will be lost."
        isDirty={() => !isSaved.current && hasDraftContent(draft)}
        title="Discard this recipe?"
      />
    </>
  );
}

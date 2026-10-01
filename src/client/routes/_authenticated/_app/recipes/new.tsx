import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { ImageUploadIcon } from "@client/components/ui/icons";
import { useMembersById } from "@client/features/household/members";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { tags$ } from "@client/features/recipes/queries";
import {
  createRecipeDraft,
  hasDraftContent,
  recipeDraftEvents,
} from "@client/features/recipes/recipe-draft";
import type { RecipeDraft } from "@client/features/recipes/recipe-draft";
import { RecipeRowsEditor } from "@client/features/recipes/recipe-rows-editor";
import { TagPicker } from "@client/features/recipes/tag-picker";
import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute, Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { ServingsControl } from "./-components/recipe-content";
import { RecipeByline } from "./-components/recipe-meta";

export const Route = createFileRoute("/_authenticated/_app/recipes/new")({
  staticData: {
    breadcrumbs: [{ label: "Recipes", link: { to: "/recipes" } }, { label: "New recipe" }],
  },
  component: NewRecipe,
});

const photoTypes = ["image/jpeg", "image/png", "image/webp"];

// Creating a recipe on a page laid out like the recipe itself. The photo is a preview until
// uploads arrive.
function NewRecipe() {
  const { household, user } = Route.useRouteContext();
  const navigate = useNavigate();
  const store = useHouseholdStore(household.id);
  const author = useMembersById()?.get(user.id);
  const tags = useHouseholdQuery(household.id, tags$);
  const [createdAt] = useState(() => new Date());
  const [draft, setDraft] = useState(createRecipeDraft);
  const [isTitleMissing, setIsTitleMissing] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  // Set once saved, so leaving for the new recipe does not ask about losing it.
  const isSaved = useRef(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Starts typing the title on desktop; on touch screens the keyboard would hide the page.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) titleRef.current?.focus();
  }, []);

  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!photoTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
      setPhotoError("Choose a JPEG, PNG or WebP photo under 10 MB.");
      return;
    }
    setPhotoError(null);
    setPhoto({ file, url: URL.createObjectURL(file) });
  }

  // Asks before leaving with unsaved writing, in the app and when closing the tab.
  const isDirty = () => !isSaved.current && hasDraftContent(draft);
  const blocker = useBlocker({
    shouldBlockFn: isDirty,
    enableBeforeUnload: isDirty,
    withResolver: true,
  });

  function update(changes: Partial<RecipeDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function createTag(name: string) {
    const id = crypto.randomUUID();
    setDraft((current) => ({ ...current, newTags: [...current.newTags, { id, name }] }));
    return id;
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.title.trim() === "") {
      setIsTitleMissing(true);
      titleRef.current?.focus();
      return;
    }
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
      <form
        className="mx-auto flex max-w-5xl flex-col gap-8 p-5 lg:gap-12 lg:p-12"
        id="new-recipe"
        noValidate
        onSubmit={save}
      >
        <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-center lg:gap-16">
          <div className="-mx-5 -mt-5 flex flex-col gap-2 lg:col-start-2 lg:row-start-1 lg:m-0">
            <label className="group relative flex aspect-5/4 cursor-pointer items-center justify-center overflow-hidden bg-olive-200 text-olive-600 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 lg:rounded-xl dark:bg-olive-800 dark:text-olive-300">
              <input
                accept={photoTypes.join(",")}
                className="sr-only"
                onChange={choosePhoto}
                type="file"
              />
              {photo && (
                <img alt="" className="absolute inset-0 size-full object-cover" src={photo.url} />
              )}
              <span
                className={
                  photo
                    ? "absolute right-3 bottom-3 flex h-8 items-center gap-2 rounded-full bg-black/60 px-3 text-sm font-medium text-white backdrop-blur-sm"
                    : "flex flex-col items-center gap-2 font-medium transition-colors group-hover:text-olive-900 dark:group-hover:text-olive-100"
                }
              >
                <ImageUploadIcon className={photo ? "size-4" : "size-6"} />
                {photo ? "Change photo" : "Add a photo"}
              </span>
            </label>
            {photoError && (
              <p className="px-5 text-sm text-red-700 lg:px-0 dark:text-red-300" role="alert">
                {photoError}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
            <RecipeByline author={author} createdAt={createdAt} />
            <h1 className="text-3xl font-medium tracking-tight">
              <textarea
                aria-describedby={isTitleMissing ? "title-error" : undefined}
                aria-invalid={isTitleMissing || undefined}
                aria-label="Recipe title"
                className="block field-sizing-content w-full resize-none bg-transparent p-0 text-balance outline-none placeholder:text-olive-400 dark:placeholder:text-olive-600"
                onChange={(event) => {
                  setIsTitleMissing(false);
                  update({ title: event.currentTarget.value.replace(/\n/gu, " ") });
                }}
                // The title wraps but stays one line; Enter moves on to the description.
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  descriptionRef.current?.focus();
                }}
                placeholder="Recipe title..."
                ref={titleRef}
                rows={1}
                value={draft.title}
              />
            </h1>
            {isTitleMissing && (
              <p className="-mt-2 text-sm text-red-700 dark:text-red-300" id="title-error">
                Add a title to save the recipe.
              </p>
            )}
            <textarea
              aria-label="Description"
              className="block field-sizing-content max-w-xl resize-none bg-transparent p-0 leading-6 text-olive-600 outline-none placeholder:text-olive-400 dark:text-olive-400 dark:placeholder:text-olive-600"
              onChange={(event) => update({ description: event.currentTarget.value })}
              placeholder="What makes it special? A tip or serving idea…"
              ref={descriptionRef}
              rows={1}
              value={draft.description}
            />
            <div className="mt-3">
              <TagPicker
                onChange={(tagIds) => update({ tagIds })}
                onCreate={createTag}
                selected={draft.tagIds}
                tags={[...tags, ...draft.newTags]}
              />
            </div>
          </div>
        </header>

        {/* One column on small screens, so everything stays in view while you write. */}
        <div className="flex flex-col gap-12 border-t pt-8 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-16 lg:pt-12">
          <section aria-labelledby="ingredients-heading" className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-medium" id="ingredients-heading">
                Ingredients
              </h2>
              <ServingsControl
                fullWidth={false}
                onValueChange={(servings) => update({ servings })}
                value={draft.servings}
              />
            </div>
            <RecipeRowsEditor
              kind="ingredients"
              labelledBy="ingredients-heading"
              onRowsChange={(ingredients) => update({ ingredients })}
              rows={draft.ingredients}
            />
          </section>
          <section aria-labelledby="instructions-heading" className="flex flex-col gap-6">
            <h2 className="text-xl font-medium" id="instructions-heading">
              Instructions
            </h2>
            <RecipeRowsEditor
              kind="instructions"
              labelledBy="instructions-heading"
              onRowsChange={(instructions) => update({ instructions })}
              rows={draft.instructions}
            />
          </section>
        </div>
      </form>
      <Dialog
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        open={blocker.status === "blocked"}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard this recipe?</DialogTitle>
            <DialogDescription>
              It has not been saved, so what you wrote will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {/* Staying is the safe choice, so it takes focus and Enter. */}
            <Button onClick={() => blocker.reset?.()} variant="primary">
              Keep writing
            </Button>
            <Button onClick={() => blocker.proceed?.()}>Discard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { Button } from "@client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { Cancel01Icon, ImageUploadIcon } from "@client/components/ui/icons";
import type { RecipeDraft } from "@client/features/recipes/recipe-draft";
import { photoEditEvents, photoInputTypes } from "@client/features/recipes/recipe-photo";
import type { PhotoEdit } from "@client/features/recipes/recipe-photo";
import { RecipeRowsEditor } from "@client/features/recipes/recipe-rows-editor";
import { TagPicker } from "@client/features/recipes/tag-picker";
import { recipeDescriptionMaxLength, recipeTitleMaxLength } from "@shared/recipes";
import type { Tag } from "@shared/recipes";
import { useBlocker } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ComponentProps, Dispatch, FormEvent, SetStateAction } from "react";

import { ServingsControl } from "./recipe-content";
import { RecipeByline } from "./recipe-meta";

// The photo picked or removed while writing, and saving that uploads it first. A recipe can
// only refer to a stored photo, so a failed upload saves nothing and keeps the page open.
export function usePhotoSave() {
  const [photo, setPhoto] = useState<PhotoEdit>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (photo && photo !== "removed") URL.revokeObjectURL(photo.previewUrl);
    },
    [photo],
  );

  function changePhoto(edit: PhotoEdit) {
    setError(null);
    setPhoto(edit);
  }

  async function save(
    meta: Parameters<typeof photoEditEvents>[1],
    commit: (photoEvents: Awaited<ReturnType<typeof photoEditEvents>>) => void,
  ) {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      commit(await photoEditEvents(photo, meta));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not save the photo.");
    } finally {
      setIsSaving(false);
    }
  }

  return { photo, changePhoto, isSaving, error, save };
}

// Writing a recipe on a page laid out like the recipe itself, for creating and editing alike.
// Saving needs a title.
export function RecipeForm({
  author,
  autoFocusTitle = false,
  createdAt,
  draft,
  id,
  imageUrl,
  onChange,
  onPhotoChange,
  onSave,
  photo,
  photoError,
  sourceUrl = null,
  tags,
}: {
  author: ComponentProps<typeof RecipeByline>["author"];
  autoFocusTitle?: boolean;
  createdAt: Date;
  draft: RecipeDraft;
  id: string;
  imageUrl?: string | null;
  onChange: Dispatch<SetStateAction<RecipeDraft>>;
  onPhotoChange: (edit: PhotoEdit) => void;
  onSave: () => void;
  photo: PhotoEdit;
  // Why the last upload failed.
  photoError: string | null;
  sourceUrl?: string | null;
  tags: readonly Tag[];
}) {
  const [isTitleMissing, setIsTitleMissing] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const photoUrl = photo === "removed" ? null : (photo?.previewUrl ?? imageUrl);
  const shownPhotoError = pickError ?? photoError;

  // Starts typing the title on desktop; on touch screens the keyboard would hide the page.
  useEffect(() => {
    if (autoFocusTitle && window.matchMedia("(pointer: fine)").matches) titleRef.current?.focus();
  }, [autoFocusTitle]);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    // Phone photos can be large; they are shrunk before uploading.
    if (!photoInputTypes.includes(file.type) || file.size > 30 * 1024 * 1024) {
      setPickError("Choose a JPEG, PNG or WebP photo under 30 MB.");
      return;
    }
    setPickError(null);
    onPhotoChange({ file, previewUrl: URL.createObjectURL(file) });
  }

  function removePhoto() {
    setPickError(null);
    // A photo picked for a recipe that had none simply goes away.
    onPhotoChange(imageUrl ? "removed" : null);
  }

  function update(changes: Partial<RecipeDraft>) {
    onChange((current) => ({ ...current, ...changes }));
  }

  // Picking the new tag follows straight after, so this builds on the latest draft.
  function createTag(name: string) {
    const tagId = crypto.randomUUID();
    onChange((current) => ({ ...current, newTags: [...current.newTags, { id: tagId, name }] }));
    return tagId;
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.title.trim() === "") {
      setIsTitleMissing(true);
      titleRef.current?.focus();
      return;
    }
    onSave();
  }

  return (
    <form
      className="mx-auto flex max-w-5xl flex-col gap-8 p-5 lg:gap-12 lg:p-12"
      id={id}
      noValidate
      onSubmit={save}
    >
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-center lg:gap-16">
        <div className="relative -mx-5 -mt-5 flex flex-col gap-2 lg:col-start-2 lg:row-start-1 lg:m-0">
          <label className="group relative flex aspect-5/4 cursor-pointer items-center justify-center overflow-hidden bg-olive-100 text-olive-500 ring-[0.5px] ring-black/10 transition-colors ring-inset hover:bg-olive-200/60 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 lg:rounded-xl dark:bg-olive-900 dark:text-olive-400 dark:ring-white/10 dark:hover:bg-olive-800/60">
            <input
              accept={photoInputTypes.join(",")}
              className="sr-only"
              onChange={choosePhoto}
              type="file"
            />
            {photoUrl && (
              <img alt="" className="absolute inset-0 size-full object-cover" src={photoUrl} />
            )}
            <span
              className={
                photoUrl
                  ? "absolute right-3 bottom-3 flex h-8 items-center gap-2 rounded-full bg-black/60 px-3 text-sm font-medium text-white backdrop-blur-sm"
                  : "flex flex-col items-center gap-2 font-medium transition-colors group-hover:text-olive-900 dark:group-hover:text-olive-100"
              }
            >
              <ImageUploadIcon className={photoUrl ? "size-4" : "size-6"} />
              {photoUrl ? "Change photo" : "Add a photo"}
            </span>
          </label>
          {/* Outside the label, so removing does not open the file picker. */}
          {photoUrl && (
            <Button
              aria-label="Remove photo"
              className="absolute top-3 right-3 bg-black/60 text-white backdrop-blur-sm hover:bg-black/75 hover:text-white dark:hover:bg-black/75"
              onClick={removePhoto}
              size="icon-sm"
              variant="ghost"
            >
              <Cancel01Icon />
            </Button>
          )}
          {shownPhotoError && (
            <p className="px-5 text-sm text-red-700 lg:px-0 dark:text-red-300" role="alert">
              {shownPhotoError}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
          <RecipeByline author={author} createdAt={createdAt} sourceUrl={sourceUrl} />
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
              maxLength={recipeTitleMaxLength}
              placeholder="Recipe title…"
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
            maxLength={recipeDescriptionMaxLength}
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
  );
}

// Asks before leaving with unsaved writing, in the app and when closing the tab.
export function UnsavedChangesDialog({
  description,
  isDirty,
  title,
}: {
  description: string;
  isDirty: () => boolean;
  title: string;
}) {
  const blocker = useBlocker({
    shouldBlockFn: isDirty,
    enableBeforeUnload: isDirty,
    withResolver: true,
  });

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) blocker.reset?.();
      }}
      open={blocker.status === "blocked"}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
  );
}

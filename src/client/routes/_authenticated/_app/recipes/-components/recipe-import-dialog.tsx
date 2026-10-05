import { Button } from "@client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@client/components/ui/field";
import { Input } from "@client/components/ui/input";
import {
  maxImportPhotos,
  startPhotoImport,
  startUrlImport,
} from "@client/features/recipes/recipe-imports";
import { useState } from "react";
import type { SubmitEvent } from "react";

export type ImportSource = "url" | "photos";

// Starts an import and closes as soon as the server has it. The recipe list shows the import
// while it runs, and the recipe saves itself when ready.
export function RecipeImportDialog({
  onOpenChange,
  source,
  tagNames,
}: {
  onOpenChange: (open: boolean) => void;
  source: ImportSource | null;
  tagNames: string[];
}) {
  const [url, setUrl] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const tooManyPhotos = photos.length > maxImportPhotos;

  function close() {
    onOpenChange(false);
    setUrl("");
    setPhotos([]);
    setError("");
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!source || isStarting) return;
    setError("");
    setIsStarting(true);
    try {
      await (source === "url" ? startUrlImport(url, tagNames) : startPhotoImport(photos, tagNames));
      close();
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "Could not start the import. Please try again.",
      );
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !isStarting) close();
      }}
      open={source !== null}
    >
      <DialogContent>
        <form className="flex flex-col gap-6" onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>
              {source === "photos" ? "Import from photo" : "Import from link"}
            </DialogTitle>
            <DialogDescription>
              {source === "photos"
                ? `Photos of a cookbook page or recipe card. Choose up to ${maxImportPhotos} for a recipe that spans pages.`
                : "Paste a link to a recipe."}{" "}
              It’s translated to your household’s language and units, and saved when ready.
            </DialogDescription>
          </DialogHeader>
          {source === "photos" ? (
            <Field>
              <FieldLabel htmlFor="import-photos">Photos</FieldLabel>
              <Input
                accept="image/*"
                aria-invalid={tooManyPhotos || error !== "" || undefined}
                disabled={isStarting}
                id="import-photos"
                multiple
                onChange={(event) => {
                  setError("");
                  setPhotos([...(event.currentTarget.files ?? [])]);
                }}
                type="file"
              />
              {tooManyPhotos && <FieldError>Choose at most {maxImportPhotos} photos.</FieldError>}
              {error && <FieldError>{error}</FieldError>}
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="import-url">Link</FieldLabel>
              <Input
                aria-invalid={error !== "" || undefined}
                disabled={isStarting}
                id="import-url"
                inputMode="url"
                onChange={(event) => {
                  setError("");
                  setUrl(event.currentTarget.value);
                }}
                placeholder="https://"
                required
                type="url"
                value={url}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
          )}
          <DialogFooter>
            <Button
              disabled={
                isStarting || (source === "photos" && (photos.length === 0 || tooManyPhotos))
              }
              type="submit"
              variant="primary"
            >
              {isStarting ? "Starting…" : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

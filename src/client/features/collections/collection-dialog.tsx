import { Button } from "@client/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@client/components/ui/field";
import { Input } from "@client/components/ui/input";
import { Textarea } from "@client/components/ui/textarea";
import { normalizeCollectionValues } from "@client/features/collections/collection-values";
import type { CollectionValues } from "@client/features/collections/collection-values";
import { useId, useState } from "react";
import type { FormEvent } from "react";

// Creates a collection, or edits one when given its current values. The caller saves them.
export function CollectionDialog({
  collection,
  onOpenChange,
  onSave,
  open,
}: {
  collection?: CollectionValues | undefined;
  onOpenChange: (open: boolean) => void;
  onSave: (values: CollectionValues) => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        {/* Mounts with each opening, so the form starts from the current values. */}
        <CollectionForm
          collection={collection}
          onSave={(values) => {
            onSave(values);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function CollectionForm({
  collection,
  onSave,
}: {
  collection?: CollectionValues | undefined;
  onSave: (values: CollectionValues) => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(collection?.title ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [isTitleMissing, setIsTitleMissing] = useState(false);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = normalizeCollectionValues({ title, description });
    if (values.title === "") {
      setIsTitleMissing(true);
      return;
    }
    onSave(values);
  }

  return (
    <form className="flex min-h-0 flex-col gap-6" noValidate onSubmit={save}>
      <DialogHeader>
        <DialogTitle>{collection ? "Edit collection" : "New collection"}</DialogTitle>
        <DialogDescription>
          {collection
            ? "Everyone in your household sees the change."
            : "Gather recipes for an occasion, a routine, or someone in the family."}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
          <Input
            aria-describedby={isTitleMissing ? `${id}-title-error` : undefined}
            aria-invalid={isTitleMissing || undefined}
            autoComplete="off"
            id={`${id}-title`}
            onValueChange={(value) => {
              setIsTitleMissing(false);
              setTitle(value);
            }}
            placeholder="Quick dinners"
            value={title}
          />
          {isTitleMissing && (
            <FieldError id={`${id}-title-error`}>Add a title to save the collection.</FieldError>
          )}
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-description`}>Description</FieldLabel>
          <Textarea
            id={`${id}-description`}
            onChange={(event) => setDescription(event.currentTarget.value)}
            placeholder="Optional"
            rows={2}
            value={description}
          />
        </Field>
      </div>
      <DialogFooter>
        <Button type="submit" variant="primary">
          {collection ? "Save" : "Create collection"}
        </Button>
        <DialogClose render={<Button />}>Cancel</DialogClose>
      </DialogFooter>
    </form>
  );
}

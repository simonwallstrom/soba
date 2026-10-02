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
import { useId, useState } from "react";
import type { FormEvent } from "react";

// Creates a collection, or renames one when given its title. The caller saves the trimmed title.
export function CollectionDialog({
  onOpenChange,
  onSave,
  open,
  title,
}: {
  onOpenChange: (open: boolean) => void;
  onSave: (title: string) => void;
  open: boolean;
  title?: string | undefined;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        {/* Mounts with each opening, so the form starts from the current title. */}
        <CollectionForm
          initialTitle={title}
          onSave={(newTitle) => {
            onSave(newTitle);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function CollectionForm({
  initialTitle,
  onSave,
}: {
  initialTitle: string | undefined;
  onSave: (title: string) => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [isTitleMissing, setIsTitleMissing] = useState(false);
  const isRenaming = initialTitle !== undefined;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed === "") {
      setIsTitleMissing(true);
      return;
    }
    onSave(trimmed);
  }

  return (
    <form className="flex min-h-0 flex-col gap-6" noValidate onSubmit={save}>
      <DialogHeader>
        <DialogTitle>{isRenaming ? "Rename collection" : "New collection"}</DialogTitle>
        <DialogDescription>
          {isRenaming
            ? "Everyone in your household sees the new name."
            : "Group recipes for an occasion or a routine."}
        </DialogDescription>
      </DialogHeader>
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
      <DialogFooter>
        <Button type="submit" variant="primary">
          {isRenaming ? "Save" : "Create collection"}
        </Button>
        <DialogClose render={<Button />}>Cancel</DialogClose>
      </DialogFooter>
    </form>
  );
}

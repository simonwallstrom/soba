import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, SubmitEvent } from "react";
import { flushSync } from "react-dom";

import { SettingsField } from "./settings-group";

// Editing a name in place. Focus moves into the field when editing starts, and `onStop` puts it
// back on the control that started it, so the keyboard stays where the row is.
export function useInlineEdit({
  onSave,
  onStop,
  value,
}: {
  onSave: (value: string) => void;
  onStop: () => void;
  value: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = draft?.trim() ?? "";

  function start() {
    flushSync(() => setDraft(value));
    inputRef.current?.select();
  }

  function stop() {
    flushSync(() => setDraft(null));
    onStop();
  }

  return {
    draft,
    start,
    stop,
    formProps: {
      onSubmit: (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (trimmed && trimmed !== value) onSave(trimmed);
        stop();
      },
    },
    inputProps: {
      // The return key saves, so it says so.
      enterKeyHint: "done" as const,
      maxLength: 80,
      onChange: (event: ChangeEvent<HTMLInputElement>) => setDraft(event.currentTarget.value),
      onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Escape") {
          event.preventDefault();
          stop();
        }
      },
      ref: inputRef,
      value: draft ?? "",
    },
    canSave: trimmed !== "",
  };
}

// A labeled name edited in place: Edit turns the value into a field, Enter saves, and Escape
// cancels.
export function EditableTextRow({
  canEdit = true,
  id,
  label,
  onSave,
  value,
}: {
  canEdit?: boolean;
  id: string;
  label: string;
  onSave: (value: string) => void;
  value: string;
}) {
  const editRef = useRef<HTMLButtonElement>(null);
  const edit = useInlineEdit({ onSave, onStop: () => editRef.current?.focus(), value });

  if (edit.draft !== null) {
    return (
      <form {...edit.formProps}>
        <SettingsField
          action={
            <>
              <Button onClick={edit.stop} type="button">
                Cancel
              </Button>
              <Button disabled={!edit.canSave} type="submit" variant="primary">
                Save
              </Button>
            </>
          }
          htmlFor={id}
          label={label}
        >
          <Input id={id} {...edit.inputProps} />
        </SettingsField>
      </form>
    );
  }

  return (
    <SettingsField
      action={
        canEdit && (
          <Button aria-label={`Edit ${label.toLowerCase()}`} onClick={edit.start} ref={editRef}>
            Edit
          </Button>
        )
      }
      label={label}
    >
      <span className="truncate">{value}</span>
    </SettingsField>
  );
}

import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@client/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@client/components/ui/field";
import {
  Add01Icon,
  Delete02Icon,
  FileEditIcon,
  GitMergeIcon,
  HashtagIcon,
  MoreHorizontalIcon,
} from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import {
  createTag,
  deleteTag,
  mergeTag,
  renameTag,
  useRecipes,
  useTags,
} from "@client/features/recipes/recipe-data";
import { compareNames, recipeTagLinks } from "@client/features/recipes/recipe-tags";
import { normalizeTagName, sameTagName } from "@shared/recipes";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import { ConfirmDialog } from "./confirm-dialog";
import { useInlineEdit } from "./editable-text-row";
import {
  inlineEditActionsStyles,
  SettingsGroup,
  SettingsRowIcon,
  settingsButtonRowStyles,
  settingsRowStyles,
} from "./settings-group";

// Tighter than other settings rows, since a household can have dozens of tags.
const tagRowStyles = cn(settingsRowStyles, "min-h-0 py-1.5");
// How many tags show before "Show all", so the list doesn't push the rest of Settings away.
const collapsedCount = 5;

type TagRowData = { id: string; name: string; count: number };
type Merge = { source: TagRowData; targetId: string | null; renamedTo: string | null };

// Endings that turn one word into another form of it: plurals, and Swedish forms like
// "Vegetarisk" and "Vegetariskt".
const wordEndings = ["s", "es", "ar", "er", "or", "na", "n", "t"];

// Lowercase without accents or punctuation, so "Crème brûlée" and "creme brulee" compare equal.
function nameKey(name: string) {
  return name
    .toLocaleLowerCase("sv-SE")
    .normalize("NFD")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function editDistance(left: string, right: string) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      const substitution = previous[j - 1]! + (left[i - 1] === right[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, substitution);
    }
    previous = current;
  }
  return previous[right.length]!;
}

// Whether two names are likely the same tag: one is another form of the other ("Dessert" and
// "Desserts"), or a typo away ("Mexcian"). Short names need an exact ending, since "Beef" and
// "Beer" are one letter apart.
function similarName(left: string, right: string) {
  const [shorter, longer] = [nameKey(left), nameKey(right)].toSorted((a, b) => a.length - b.length);
  if (!shorter || !longer || shorter === longer) return false;
  if (shorter.length >= 3 && longer.startsWith(shorter)) {
    if (wordEndings.includes(longer.slice(shorter.length))) return true;
  }
  if (shorter.length < 5) return false;
  return editDistance(shorter, longer) <= (shorter.length >= 8 ? 2 : 1);
}

function recipeCount(count: number) {
  return `${count} ${count === 1 ? "recipe" : "recipes"}`;
}

// What merging does, in the dialog: where the tag's recipes go, or that it just goes, when it's
// on none.
function mergeDescription(source: TagRowData | undefined, renamedTo: string | null, into?: string) {
  const name = source?.name ?? "";
  const count = source?.count ?? 0;
  const moves = `Its ${recipeCount(count)} ${count === 1 ? "moves" : "move"}`;
  if (renamedTo) {
    return count === 0
      ? `Merge “${name}” into it? “${name}” isn’t on any recipes, so it’s just removed.`
      : `Merge “${name}” into it? ${moves} to “${renamedTo}”.`;
  }
  if (into) {
    return count === 0
      ? `“${name}” isn’t on any recipes, so it’s just removed.`
      : `${moves} to “${into}”, and “${name}” is removed.`;
  }
  return count === 0
    ? `Pick a tag to merge it into. “${name}” is removed.`
    : `Pick the tag its ${recipeCount(count)} should move to. “${name}” is removed.`;
}

// The household's tags, which every member can add, rename, merge, and delete. Changes show at
// once and save in the background, like recipe edits.
export function TagsGroup() {
  const recipes = useRecipes();
  const tags = useTags();
  // Kept after a dialog closes, so its text doesn't change while it animates out.
  const [merge, setMerge] = useState<Merge | null>(null);
  const [merging, setMerging] = useState(false);
  const [deleting, setDeleting] = useState<TagRowData | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showingAll, setShowingAll] = useState(false);

  const counts = new Map<string, number>();
  for (const { tagId } of recipeTagLinks(recipes)) {
    counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
  }
  const rows = tags
    .map((tag) => ({ id: tag.id, name: tag.name, count: counts.get(tag.id) ?? 0 }))
    .toSorted((left, right) => compareNames(left.name, right.name));

  // A new tag can sort past the first few, so the list opens up to show it.
  function add(name: string) {
    void createTag(crypto.randomUUID(), name);
    setShowingAll(true);
  }

  function rename(row: TagRowData, name: string) {
    const existing = rows.find((other) => other.id !== row.id && sameTagName(other.name, name));
    // Renaming onto another tag's name means they're the same tag, so offer to merge instead.
    if (existing) {
      setMerge({ source: row, targetId: existing.id, renamedTo: existing.name });
      setMerging(true);
      return;
    }
    void renameTag(row.id, name);
  }

  return (
    <>
      <SettingsGroup id="tags" note="Everyone in the household shares these." title="Tags">
        {/* First, so it stays in reach however long the list gets. */}
        <AddTagRow names={rows.map(({ name }) => name)} onAdd={add} />
        {(showingAll ? rows : rows.slice(0, collapsedCount)).map((row) => (
          <TagRow
            key={row.id}
            onDelete={() => {
              // An unused tag goes without asking; there's nothing to lose.
              if (row.count === 0) {
                void deleteTag(row.id);
                return;
              }
              setDeleting(row);
              setConfirmingDelete(true);
            }}
            onMerge={() => {
              setMerge({ source: row, targetId: null, renamedTo: null });
              setMerging(true);
            }}
            onRename={(name) => rename(row, name)}
            row={row}
          />
        ))}
        {rows.length > collapsedCount && (
          <button
            className={cn(settingsButtonRowStyles, "min-h-11 font-normal text-olive-500")}
            onClick={() => setShowingAll((current) => !current)}
            type="button"
          >
            {/* As wide as the tags' icons, so the text lines up with their names. */}
            <span className="w-8 shrink-0" />
            {showingAll ? "Show fewer" : `Show all ${rows.length} tags`}
          </button>
        )}
      </SettingsGroup>

      <MergeDialog
        merge={merge}
        onConfirm={(targetId) => {
          if (merge) void mergeTag(merge.source.id, targetId);
        }}
        onOpenChange={setMerging}
        onTargetChange={(targetId) => setMerge((current) => current && { ...current, targetId })}
        open={merging}
        targets={rows.filter((row) => row.id !== merge?.source.id)}
      />

      <ConfirmDialog
        action="Delete"
        description={`It's removed from ${recipeCount(deleting?.count ?? 0)}. The recipes stay.`}
        onConfirm={() => {
          if (deleting) void deleteTag(deleting.id);
        }}
        onOpenChange={setConfirmingDelete}
        open={confirmingDelete}
        title={`Delete “${deleting?.name ?? ""}”?`}
      />
    </>
  );
}

// Opens into a field for the new tag's name. A name that's already taken can't be added twice.
function AddTagRow({ names, onAdd }: { names: readonly string[]; onAdd: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const name = normalizeTagName(draft ?? "");
  const existing = names.find((other) => sameTagName(other, name));
  // Only a hint: "Bread" and "Break" are close too, so a similar name can still be added.
  const similar = existing ? undefined : names.find((other) => similarName(other, name));
  const hint = existing
    ? `“${existing}” already exists.`
    : similar && `“${similar}” already exists. Add this as a new tag anyway?`;

  function stop() {
    flushSync(() => setDraft(null));
    buttonRef.current?.focus();
  }

  if (draft === null) {
    return (
      <button
        className={cn(settingsButtonRowStyles, "min-h-11")}
        onClick={() => {
          flushSync(() => setDraft(""));
          inputRef.current?.focus();
        }}
        ref={buttonRef}
        type="button"
      >
        <SettingsRowIcon>
          <Add01Icon className="size-4" />
        </SettingsRowIcon>
        Add tag
      </button>
    );
  }

  return (
    <form
      className={cn(tagRowStyles, "flex-wrap")}
      onSubmit={(event) => {
        event.preventDefault();
        if (!name || existing) return;
        onAdd(name);
        stop();
      }}
    >
      <SettingsRowIcon>
        <HashtagIcon className="size-3.5 text-olive-500" />
      </SettingsRowIcon>
      <Input
        aria-describedby={hint ? "add-tag-hint" : undefined}
        aria-invalid={existing ? true : undefined}
        aria-label="New tag name"
        className="min-w-0 flex-1"
        enterKeyHint="done"
        maxLength={80}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            stop();
          }
        }}
        placeholder="Tag name"
        ref={inputRef}
        value={draft}
      />
      <div className={inlineEditActionsStyles}>
        <Button onClick={stop} type="button">
          Cancel
        </Button>
        <Button disabled={!name || Boolean(existing)} type="submit" variant="primary">
          Add
        </Button>
      </div>
      {hint && (
        <p className="w-full pb-1 pl-11 text-sm text-olive-500" id="add-tag-hint">
          {hint}
        </p>
      )}
    </form>
  );
}

// One tag: its name, how many recipes use it, and a menu. Rename edits the name in place, like
// the household's name.
function TagRow({
  onDelete,
  onMerge,
  onRename,
  row,
}: {
  onDelete: () => void;
  onMerge: () => void;
  onRename: (name: string) => void;
  row: TagRowData;
}) {
  const menuRef = useRef<HTMLButtonElement>(null);
  const edit = useInlineEdit({
    onSave: onRename,
    onStop: () => menuRef.current?.focus(),
    value: row.name,
  });

  const icon = (
    <SettingsRowIcon>
      <HashtagIcon className="size-3.5 text-olive-500" />
    </SettingsRowIcon>
  );

  if (edit.draft !== null) {
    return (
      <form className={cn(tagRowStyles, "flex-wrap")} {...edit.formProps}>
        {icon}
        <Input aria-label="Tag name" className="min-w-0 flex-1" {...edit.inputProps} />
        <div className={inlineEditActionsStyles}>
          <Button onClick={edit.stop} type="button">
            Cancel
          </Button>
          <Button disabled={!edit.canSave} type="submit" variant="primary">
            Save
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className={tagRowStyles}>
      {icon}
      {/* Unused tags fade back with their "Not used", so the ones in use stand out. */}
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          row.count === 0 && "text-olive-500 dark:text-olive-400",
        )}
      >
        {row.name}
      </span>
      {row.count === 0 ? (
        <span className="text-sm text-olive-400 dark:text-olive-600">Not used</span>
      ) : (
        <Link
          className="rounded-sm text-sm text-olive-500 tabular-nums hover:text-olive-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:text-olive-200"
          search={{ tags: [row.id] }}
          to="/recipes"
        >
          {row.count}
          <span className="max-sm:hidden"> {row.count === 1 ? "recipe" : "recipes"}</span>
        </Link>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`More actions for ${row.name}`}
          className={buttonVariants({ className: "-mr-2", size: "icon", variant: "ghost" })}
          ref={menuRef}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={edit.start}>
            <FileEditIcon />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMerge}>
            <GitMergeIcon />
            Merge into…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} variant="destructive">
            <Delete02Icon />
            Delete{row.count > 0 && "…"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Moves one tag's recipes to another and removes it. Opened from the menu, it asks which tag to
// merge into; opened by renaming onto an existing name, that tag is already chosen.
function MergeDialog({
  merge,
  onConfirm,
  onOpenChange,
  onTargetChange,
  open,
  targets,
}: {
  merge: Merge | null;
  onConfirm: (targetId: string) => void;
  onOpenChange: (open: boolean) => void;
  onTargetChange: (targetId: string) => void;
  open: boolean;
  targets: readonly TagRowData[];
}) {
  const source = merge?.source;
  const target = targets.find((tag) => tag.id === merge?.targetId);
  const sourceName = source?.name ?? "";
  const names = new Map(targets.map((tag) => [tag.id, tag.name]));
  const counts = new Map(targets.map((tag) => [tag.id, tag.count]));

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {merge?.renamedTo ? `“${merge.renamedTo}” already exists` : `Merge “${sourceName}”`}
          </DialogTitle>
          <DialogDescription>
            {mergeDescription(source, merge?.renamedTo ?? null, target?.name)}
          </DialogDescription>
        </DialogHeader>
        {!merge?.renamedTo && (
          // Searchable, since a household can have dozens of tags.
          <Field>
            <FieldLabel htmlFor="merge-target">Into</FieldLabel>
            <Combobox
              autoHighlight
              itemToStringLabel={(id: string) => names.get(id) ?? ""}
              items={targets.map((tag) => tag.id)}
              onValueChange={(targetId: string | null) => {
                if (targetId) onTargetChange(targetId);
              }}
              value={merge?.targetId ?? null}
            >
              <ComboboxInput id="merge-target" placeholder="Search tags…" />
              <ComboboxContent>
                <ComboboxEmpty>No tags match.</ComboboxEmpty>
                <ComboboxList className="max-h-64">
                  {(id: string) => (
                    <ComboboxItem key={id} value={id}>
                      {names.get(id)}
                      <span className="pl-2 text-olive-500 tabular-nums">{counts.get(id)}</span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
        )}
        <DialogFooter>
          <Button
            disabled={!target}
            onClick={() => {
              if (!target) return;
              onOpenChange(false);
              onConfirm(target.id);
            }}
            variant="primary"
          >
            Merge
          </Button>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

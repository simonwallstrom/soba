import { Button } from "@client/components/ui/button";
import { Add01Icon } from "@client/components/ui/icons";
import { choiceStyles, textEntryStyles } from "@client/components/ui/styles";
import { createRow, groupRows, parsePastedLines } from "@client/features/recipes/recipe-rows";
import type { RecipeRow } from "@client/features/recipes/recipe-rows";
import { cn } from "cn";
import { useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { flushSync } from "react-dom";

type Kind = "ingredients" | "instructions";

const placeholders = {
  ingredients: "Add an ingredient…",
  instructions: "Describe a step…",
} satisfies Record<Kind, string>;

// Ingredients or instructions as one text field per line, styled like the recipe page.
// Enter adds a line, Backspace at the start joins lines, and a heading starts a section.
export function RecipeRowsEditor({
  kind,
  labelledBy,
  onRowsChange,
  rows,
}: {
  kind: Kind;
  labelledBy: string;
  onRowsChange: (rows: RecipeRow[]) => void;
  rows: readonly RecipeRow[];
}) {
  const fields = useRef(new Map<string, HTMLTextAreaElement>());
  const indexById = new Map(rows.map((row, index) => [row.id, index]));
  // Steps are numbered across sections, as on the recipe page.
  const stepById = new Map(
    rows.filter((row) => row.kind === "item").map((row, index) => [row.id, index + 1]),
  );

  // Renders synchronously before focusing, so iOS keeps the keyboard open on the new field.
  function change(next: RecipeRow[], focus?: { id: string; at: number }) {
    flushSync(() => onRowsChange(next));
    if (!focus) return;
    const field = fields.current.get(focus.id);
    field?.focus();
    field?.setSelectionRange(focus.at, focus.at);
  }

  function replace(index: number, count: number, ...inserted: RecipeRow[]) {
    return rows.toSpliced(index, count, ...inserted);
  }

  function handleChange(row: RecipeRow, index: number, text: string) {
    // Typing "# " at the start of a line turns it into a section heading.
    if (row.kind === "item" && text.startsWith("# ")) {
      change(replace(index, 1, { ...row, kind: "heading", text: text.slice(2) }), {
        id: row.id,
        at: 0,
      });
    } else {
      change(replace(index, 1, { ...row, text }));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, row: RecipeRow, index: number) {
    if (event.nativeEvent.isComposing) return;
    const { selectionEnd: end, selectionStart: start, value } = event.currentTarget;
    const previous = rows[index - 1];
    const next = rows[index + 1];

    if (event.key === "Enter") {
      event.preventDefault();
      // An empty last line ends the list instead of adding another.
      if (row.kind === "item" && value === "" && !next) {
        event.currentTarget.blur();
        return;
      }
      const added = createRow("item", value.slice(end));
      change(replace(index, 1, { ...row, text: value.slice(0, start) }, added), {
        id: added.id,
        at: 0,
      });
      return;
    }

    if (event.key === "Backspace" && start === 0 && end === 0) {
      if (row.kind === "heading") {
        event.preventDefault();
        change(replace(index, 1, { ...row, kind: "item" }), { id: row.id, at: 0 });
      } else if (previous?.kind === "item") {
        event.preventDefault();
        change(replace(index - 1, 2, { ...previous, text: previous.text + value }), {
          id: previous.id,
          at: previous.text.length,
        });
      } else if (previous && value === "") {
        event.preventDefault();
        change(replace(index, 1), { id: previous.id, at: previous.text.length });
      }
      return;
    }

    if (event.key === "ArrowUp" && previous && start === 0 && end === 0) {
      event.preventDefault();
      fields.current.get(previous.id)?.focus();
      return;
    }

    if (event.key === "ArrowDown" && next && start === value.length) {
      event.preventDefault();
      const field = fields.current.get(next.id);
      field?.focus();
      field?.setSelectionRange(0, 0);
    }
  }

  // Pasting several lines splits them into rows, with headings and list markers recognised.
  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>, row: RecipeRow, index: number) {
    const text = event.clipboardData.getData("text/plain");
    if (!/\r?\n/u.test(text.trim())) return;
    const pasted = parsePastedLines(text);
    const first = pasted[0];
    if (!first) return;
    event.preventDefault();

    const { selectionEnd: end, selectionStart: start, value } = event.currentTarget;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const inserted =
      value.trim() === ""
        ? [{ ...first, id: row.id }, ...pasted.slice(1)]
        : [{ ...row, text: before + first.text }, ...pasted.slice(1)];
    const last = inserted.at(-1)!;
    const at = last.text.length;
    last.text += after;
    change(replace(index, 1, ...inserted), { id: last.id, at });
  }

  function addSection() {
    const heading = createRow("heading");
    change([...rows, heading, createRow("item")], { id: heading.id, at: 0 });
  }

  function renderField(row: RecipeRow, label: string, className?: string) {
    const index = indexById.get(row.id)!;
    return (
      <textarea
        aria-label={label}
        className={cn(
          textEntryStyles,
          "block field-sizing-content w-full min-w-0 resize-none bg-transparent p-0 outline-none",
          className,
        )}
        enterKeyHint="next"
        onChange={(event) => handleChange(row, index, event.currentTarget.value)}
        onKeyDown={(event) => handleKeyDown(event, row, index)}
        onPaste={(event) => handlePaste(event, row, index)}
        placeholder={row.kind === "heading" ? "Section name…" : placeholders[kind]}
        ref={(element) => {
          if (element) fields.current.set(row.id, element);
          else fields.current.delete(row.id);
        }}
        rows={1}
        value={row.text}
      />
    );
  }

  return (
    <fieldset
      aria-labelledby={labelledBy}
      className={cn(
        "flex min-w-0 flex-col gap-8",
        kind === "instructions" && "max-w-2xl [counter-reset:steps]",
      )}
    >
      {groupRows(rows).map(({ heading, items }) => (
        <div
          className={cn("flex flex-col", kind === "ingredients" ? "gap-2" : "gap-3")}
          key={heading?.id ?? "start"}
        >
          {heading && renderField(heading, "Section name", "font-medium")}
          {items.length > 0 &&
            (kind === "ingredients" ? (
              <ul className="divide-y divide-dashed border-y border-dashed">
                {items.map((item) => (
                  <li className="flex items-start gap-3 py-2.5" key={item.id}>
                    <span aria-hidden="true" className={cn(choiceStyles, "mt-0.5 rounded-sm")} />
                    {renderField(item, "Ingredient")}
                  </li>
                ))}
              </ul>
            ) : (
              <ol className="flex flex-col gap-5">
                {items.map((item) => (
                  <li
                    className="grid grid-cols-[2rem_minmax(0,1fr)] leading-6 [counter-increment:steps] before:font-mono before:text-olive-400 before:content-[counter(steps,decimal-leading-zero)]"
                    key={item.id}
                  >
                    {renderField(item, `Step ${stepById.get(item.id)}`, "leading-6")}
                  </li>
                ))}
              </ol>
            ))}
        </div>
      ))}
      <Button className="-mt-4 -ml-2 self-start" onClick={addSection} size="sm" variant="ghost">
        <Add01Icon />
        Add section
      </Button>
    </fieldset>
  );
}

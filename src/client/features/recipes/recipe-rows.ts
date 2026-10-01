import type { RecipeSection } from "@shared/recipes";

// One line in the ingredients or instructions editor. Rows are flat; headings start sections.
export type RecipeRow = {
  id: string;
  kind: "item" | "heading";
  text: string;
};

// A heading with the items below it, or the items before the first heading.
export type RecipeRowGroup = {
  heading?: RecipeRow;
  items: RecipeRow[];
};

export function createRow(kind: RecipeRow["kind"] = "item", text = ""): RecipeRow {
  return { id: crypto.randomUUID(), kind, text };
}

export function groupRows(rows: readonly RecipeRow[]): RecipeRowGroup[] {
  const groups: RecipeRowGroup[] = [];
  for (const row of rows) {
    const current = groups.at(-1);
    if (row.kind === "heading") groups.push({ heading: row, items: [] });
    else if (current) current.items.push(row);
    else groups.push({ items: [row] });
  }
  return groups;
}

// Blank items are dropped; an unnamed section with nothing in it disappears.
export function rowsToSections(rows: readonly RecipeRow[]): RecipeSection[] {
  return groupRows(rows).flatMap(({ heading, items }) => {
    const headingText = heading?.text.trim();
    const itemTexts = items.map((item) => item.text.trim()).filter(Boolean);
    if (!headingText && itemTexts.length === 0) return [];
    return [headingText ? { heading: headingText, items: itemTexts } : { items: itemTexts }];
  });
}

const listMarker = /^(?:[-*•–]|\d+[.)])\s+/u;
const markdownHeading = /^#+\s*/u;

// Splits pasted text into rows. Lines starting with `#` or ending with a colon become headings,
// and list markers like `-` or `1.` are removed.
export function parsePastedLines(text: string): RecipeRow[] {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (markdownHeading.test(line))
        return createRow("heading", line.replace(markdownHeading, ""));
      if (line.endsWith(":")) return createRow("heading", line.slice(0, -1).trim());
      return createRow("item", line.replace(listMarker, ""));
    });
}

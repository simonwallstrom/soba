import { describe, expect, test } from "bun:test";

import {
  addSection,
  createRow,
  groupRows,
  parsePastedLines,
  rowsToSections,
  sectionsToRows,
} from "./recipe-rows";

function shape(rows: ReturnType<typeof parsePastedLines>) {
  return rows.map(({ kind, text }) => ({ kind, text }));
}

describe("groupRows", () => {
  test("starts a group at each heading and keeps leading items unnamed", () => {
    const rows = [
      createRow("item", "Salt"),
      createRow("heading", "Sauce"),
      createRow("item", "Miso"),
    ];
    expect(
      groupRows(rows).map(({ heading, items }) => ({
        heading: heading?.text,
        items: items.map((item) => item.text),
      })),
    ).toEqual([
      { heading: undefined, items: ["Salt"] },
      { heading: "Sauce", items: ["Miso"] },
    ]);
  });
});

describe("rowsToSections", () => {
  test("trims text and drops blank items and empty unnamed sections", () => {
    const rows = [
      createRow("item", "  "),
      createRow("heading", " Noodles "),
      createRow("item", " Soba "),
      createRow("item", ""),
    ];
    expect(rowsToSections(rows)).toEqual([{ heading: "Noodles", items: ["Soba"] }]);
  });

  test("keeps a named section without items", () => {
    expect(rowsToSections([createRow("heading", "Topping")])).toEqual([
      { heading: "Topping", items: [] },
    ]);
  });

  test("treats a blank heading as no heading", () => {
    const rows = [createRow("heading", " "), createRow("item", "Leek")];
    expect(rowsToSections(rows)).toEqual([{ items: ["Leek"] }]);
  });
});

describe("sectionsToRows", () => {
  test("puts each heading before its items and round-trips through rowsToSections", () => {
    const sections = [
      { items: ["Salt"] },
      { heading: "Sauce", items: ["Miso", "Mirin"] },
      { heading: "Topping", items: [] },
    ];
    const rows = sectionsToRows(sections);
    expect(shape(rows)).toEqual([
      { kind: "item", text: "Salt" },
      { kind: "heading", text: "Sauce" },
      { kind: "item", text: "Miso" },
      { kind: "item", text: "Mirin" },
      { kind: "heading", text: "Topping" },
    ]);
    expect(rowsToSections(rows)).toEqual(sections);
  });

  test("starts with one empty line when there is nothing saved", () => {
    expect(shape(sectionsToRows([]))).toEqual([{ kind: "item", text: "" }]);
  });
});

describe("parsePastedLines", () => {
  test("detects headings and strips list markers", () => {
    const text = "## Broth\n- 1 l dashi\n\n2. Soy sauce\nFor the topping:\n1.5 dl cream\n• Leek";
    expect(shape(parsePastedLines(text))).toEqual([
      { kind: "heading", text: "Broth" },
      { kind: "item", text: "1 l dashi" },
      { kind: "item", text: "Soy sauce" },
      { kind: "heading", text: "For the topping" },
      { kind: "item", text: "1.5 dl cream" },
      { kind: "item", text: "Leek" },
    ]);
  });

  test("keeps colons inside a line", () => {
    expect(shape(parsePastedLines("Salt: to taste"))).toEqual([
      { kind: "item", text: "Salt: to taste" },
    ]);
  });
});

describe("addSection", () => {
  const salt = createRow("item", "Salt");
  const empty = createRow("item");
  const miso = createRow("item", "Miso");

  test("puts a heading above the line the cursor is on, when it has text", () => {
    const added = addSection([salt, miso], miso.id);
    expect(shape(added.rows)).toEqual([
      { kind: "item", text: "Salt" },
      { kind: "heading", text: "" },
      { kind: "item", text: "Miso" },
    ]);
    expect(added.rows[1]).toBe(added.heading);
  });

  test("turns an empty line into the heading, with a line to write in below", () => {
    expect(shape(addSection([salt, empty, miso], empty.id).rows)).toEqual([
      { kind: "item", text: "Salt" },
      { kind: "heading", text: "" },
      { kind: "item", text: "Miso" },
    ]);
    const last = addSection([salt, empty], empty.id);
    expect(shape(last.rows)).toEqual([
      { kind: "item", text: "Salt" },
      { kind: "heading", text: "" },
      { kind: "item", text: "" },
    ]);
    expect(last.heading.id).toBe(empty.id);
  });

  test("goes last without a line, or from a heading", () => {
    const sauce = createRow("heading", "Sauce");
    const expected: ReturnType<typeof shape> = [
      { kind: "heading", text: "Sauce" },
      { kind: "item", text: "Miso" },
      { kind: "heading", text: "" },
      { kind: "item", text: "" },
    ];
    expect(shape(addSection([sauce, miso]).rows)).toEqual(expected);
    expect(shape(addSection([sauce, miso], sauce.id).rows)).toEqual(expected);
  });
});

import { describe, expect, test } from "bun:test";

import { createRow, groupRows, parsePastedLines, rowsToSections } from "./recipe-rows";

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

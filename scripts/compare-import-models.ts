// Runs the same recipes through several models and writes a side-by-side report, so you can pick
// importModels in src/server/recipe-import/extract.ts on real recipes rather than benchmarks.
//
// Usage: bun scripts/compare-import-models.ts [options] <source>...
//   A source is a recipe link, a photo, or photos of one recipe joined with "+" (page1.jpg+page2.jpg).
//   --models a,b,c    AI Gateway "provider/model" names (default: see defaultModels)
//   --language sv     household language (default: sv)
//   --units metric    metric or us (default: metric)
//   --tags A,B        the household's tag names (default: none)
//
// Reads AI_GATEWAY_URL and AI_GATEWAY_TOKEN from the environment or .dev.vars. Photos are shrunk like the app does
// before uploading, with macOS's sips, so HEIC photos from a phone work too. Every run costs a
// little: each source is sent once per model.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { householdLanguages, householdUnits } from "@shared/household";
import type { HouseholdLanguage, HouseholdUnits } from "@shared/household";
import type { ImportedRecipe } from "@shared/recipe-import";

import { detectPhotoType } from "../src/server/photos/photo";
import { cleanRecipe, requestExtraction } from "../src/server/recipe-import/extract";
import type { Gateway, Photo, Source, Usage } from "../src/server/recipe-import/extract";
import { fetchRecipePage, parseRecipeUrl } from "../src/server/recipe-import/page";

// Names that answered through AI Gateway on 2026-10-05. Google models take the "google-ai-studio/"
// prefix there; check the gateway's model catalog for newer ones.
const defaultModels = [
  "anthropic/claude-haiku-4-5",
  "anthropic/claude-sonnet-5-5",
  "google-ai-studio/gemini-3-flash-preview",
  "openai/gpt-5-mini",
];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function readDevVars() {
  let text = "";
  try {
    text = readFileSync(".dev.vars", "utf8");
  } catch {
    fail(
      "No .dev.vars found. Copy .dev.vars.example and fill in AI_GATEWAY_URL and AI_GATEWAY_TOKEN.",
    );
  }
  return new Map(
    text
      .split("\n")
      .map((line) => line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/u))
      .filter((match) => match !== null)
      .map((match) => [match[1] ?? "", (match[2] ?? "").replace(/^["']|["']$/gu, "")]),
  );
}

function parseArgs(args: string[]) {
  const options = new Map<string, string>();
  const sources: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index] ?? "";
    if (arg.startsWith("--")) {
      options.set(arg.slice(2), args[index + 1] ?? "");
      index++;
    } else {
      sources.push(arg);
    }
  }
  return { options, sources };
}

const list = (value: string | undefined) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const { options, sources } = parseArgs(process.argv.slice(2));
if (sources.length === 0) fail("Pass at least one recipe link or photo. See the top of this file.");

const language = options.get("language") ?? "sv";
const units = options.get("units") ?? "metric";
if (!householdLanguages.some((option) => option.value === language)) {
  fail(`Unknown language ${language}.`);
}
if (!householdUnits.some((option) => option.value === units)) fail(`Unknown units ${units}.`);
const settings = {
  // Checked against the lists above.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  language: language as HouseholdLanguage,
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  units: units as HouseholdUnits,
  tagNames: list(options.get("tags")) ?? [],
};
const models = list(options.get("models")) ?? defaultModels;

const vars = readDevVars();
const gateway: Gateway = {
  url: process.env["AI_GATEWAY_URL"] ?? vars.get("AI_GATEWAY_URL") ?? "",
  token: process.env["AI_GATEWAY_TOKEN"] ?? vars.get("AI_GATEWAY_TOKEN") ?? "",
};
if (!gateway.url || !gateway.token) fail("Set AI_GATEWAY_URL and AI_GATEWAY_TOKEN in .dev.vars.");

const scratch = mkdtempSync(join(tmpdir(), "soba-compare-"));

// Shrinks a photo to what the app uploads: at most 1600 px on the long edge, as JPEG.
function readPhoto(path: string): Photo {
  const out = join(scratch, `${crypto.randomUUID()}.jpg`);
  const result = Bun.spawnSync([
    "sips",
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    "82",
    "-Z",
    "1600",
    path,
    "--out",
    out,
  ]);
  if (result.exitCode !== 0) fail(`Could not read the photo ${path}.`);
  const bytes = new Uint8Array(readFileSync(out));
  const type = detectPhotoType(bytes);
  if (!type) fail(`Could not read the photo ${path}.`);
  return { bytes, type };
}

async function readSource(value: string): Promise<Source> {
  const url = parseRecipeUrl(value);
  if (url) return { kind: "page", page: await fetchRecipePage(url) };
  return { kind: "photos", photos: value.split("+").map(readPhoto) };
}

type Run =
  | { model: string; ms: number; usage: Usage; recipe: ImportedRecipe }
  | { model: string; ms: number; error: string };

async function run(model: string, source: Source): Promise<Run> {
  const start = performance.now();
  try {
    const { extraction, usage } = await requestExtraction(gateway, model, source, settings);
    const recipe = cleanRecipe(extraction, settings.tagNames);
    return { model, ms: performance.now() - start, usage, recipe };
  } catch (error) {
    return {
      model,
      ms: performance.now() - start,
      error:
        error instanceof Error
          ? [error.message, error.cause ? JSON.stringify(error.cause, null, 2) : ""].join("\n\n")
          : String(error),
    };
  }
}

function formatSections(
  heading: string,
  sections: ImportedRecipe["ingredients"],
  numbered: boolean,
) {
  return [
    `**${heading}**`,
    ...sections.flatMap((section) => [
      ...(section.heading ? [`_${section.heading}_`] : []),
      ...section.items.map((item, index) => `${numbered ? `${index + 1}.` : "-"} ${item}`),
      "",
    ]),
  ];
}

function formatRecipe(recipe: ImportedRecipe) {
  return [
    `**${recipe.title}**`,
    "",
    recipe.description,
    "",
    `Servings: ${recipe.servings ?? "–"} · Tags: ${recipe.tags.join(", ") || "–"}`,
    "",
    ...formatSections("Ingredients", recipe.ingredients, false),
    ...formatSections("Instructions", recipe.instructions, true),
  ].join("\n");
}

const report = [
  `# Import model comparison`,
  "",
  `${new Date().toLocaleString("sv-SE")} · language ${settings.language} · units ${settings.units} · tags ${settings.tagNames.join(", ") || "none"}`,
  "",
];

for (const value of sources) {
  const label = value.startsWith("http")
    ? value
    : value
        .split("+")
        .map((path) => basename(path))
        .join(" + ");
  console.log(`Reading ${label}…`);
  let source: Source;
  try {
    source = await readSource(value);
  } catch (error) {
    report.push(
      `## ${label}`,
      "",
      `Could not read it: ${error instanceof Error ? error.message : String(error)}`,
      "",
    );
    continue;
  }
  console.log(`  asking ${models.length} models…`);
  const runs = await Promise.all(models.map((model) => run(model, source)));

  report.push(
    `## ${label}`,
    "",
    "| Model | Seconds | Input tokens | Output tokens | Result |",
    "| --- | --: | --: | --: | --- |",
    ...runs.map((result) =>
      "error" in result
        ? `| ${result.model} | ${(result.ms / 1000).toFixed(1)} | | | Failed |`
        : `| ${result.model} | ${(result.ms / 1000).toFixed(1)} | ${result.usage.inputTokens} | ${result.usage.outputTokens} | ${result.recipe.title} |`,
    ),
    "",
  );
  for (const result of runs) {
    report.push(
      `### ${result.model}`,
      "",
      "error" in result ? `Failed: ${result.error}` : formatRecipe(result.recipe),
      "",
    );
  }
}

mkdirSync(".import-comparison", { recursive: true });
const file = join(".import-comparison", `${new Date().toISOString().replace(/[:.]/gu, "-")}.md`);
writeFileSync(file, report.join("\n"));
console.log(`Wrote ${file}`);

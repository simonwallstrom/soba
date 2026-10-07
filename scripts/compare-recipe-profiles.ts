// Reads the hand-labeled sample recipes with Clef and reports how often it agrees with the labels,
// so changes to the profile questions in src/server/recipe-profile/clef.ts can be measured
// rather than guessed. Disagreements list Clef's confidence: a close call may mean a vague
// question, and some may be the label that's wrong.
//
// Usage: bun run profile:compare
//
// Runs Workers AI through the cf CLI, so log in with it first. Each run reads 20 recipes, which
// costs a fraction of a cent.
import { recipeProfileSource } from "@shared/meal-plan";
import type { RecipeProfileAnswers } from "@shared/meal-plan";

import { profileFromAnswers, profileQuestions } from "../src/server/recipe-profile/clef";
import { sampleRecipes } from "./seed/sample-recipes";

const questions = ["isDinner", "base", "protein", "effort", "isTreat"] as const;
const concurrency = 4;

// How close a call it was: the probability of yes, the confidence of a choice, or the raw effort
// score (0 quick, 1 normal, 2 involved; rounded to the nearest).
function closeness(answer: unknown) {
  if (typeof answer !== "object" || answer === null) return "";
  if ("noul" in answer && typeof answer.noul === "number") return `yes ${answer.noul.toFixed(2)}`;
  if ("score" in answer && typeof answer.score === "number")
    return `score ${answer.score.toFixed(2)}`;
  if ("confidence" in answer && typeof answer.confidence === "number") {
    return `confidence ${answer.confidence.toFixed(2)}`;
  }
  return "";
}

async function readProfile(recipe: (typeof sampleRecipes)[number]) {
  const body = JSON.stringify({
    model: "clef",
    state: recipeProfileSource(recipe),
    questions: profileQuestions,
  });
  const process = Bun.spawn(["cf", "ai", "run", "@cf/cloudflare/clef", "--body", body, "-q"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [output, errors, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) throw new Error(`cf ai run failed for "${recipe.title}":\n${errors}`);
  const response: unknown = JSON.parse(output);
  const profile = profileFromAnswers(response);
  if (!profile) throw new Error(`Unexpected answer for "${recipe.title}":\n${output}`);
  const answers = new Map<string, unknown>(
    typeof response === "object" &&
      response !== null &&
      "answers" in response &&
      typeof response.answers === "object" &&
      response.answers !== null
      ? Object.entries(response.answers)
      : [],
  );
  return { profile, answers };
}

const results: {
  title: string;
  label: RecipeProfileAnswers;
  profile: RecipeProfileAnswers;
  answers: ReadonlyMap<string, unknown>;
}[] = [];
const queue = [...sampleRecipes];
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    for (let recipe = queue.shift(); recipe; recipe = queue.shift()) {
      const { profile, answers } = await readProfile(recipe);
      results.push({ title: recipe.title, label: recipe.profile, profile, answers });
      process.stderr.write(".");
    }
  }),
);
process.stderr.write("\n\n");
results.sort((left, right) => left.title.localeCompare(right.title, "sv"));

console.log(`Agreement with the labels, ${results.length} recipes\n`);
for (const question of questions) {
  const agreed = results.filter(({ label, profile }) => label[question] === profile[question]);
  const percent = Math.round((agreed.length / results.length) * 100);
  console.log(
    `  ${question.padEnd(9)} ${String(percent).padStart(3)}%  ${agreed.length}/${results.length}`,
  );
}

const disagreements = results.flatMap(({ title, label, profile, answers }) =>
  questions.flatMap((question) =>
    label[question] === profile[question]
      ? []
      : [
          {
            title,
            question,
            label: label[question],
            clef: profile[question],
            closeness: closeness(answers.get(question)),
          },
        ],
  ),
);
if (disagreements.length === 0) {
  console.log("\nNo disagreements.");
} else {
  console.log("\nDisagreements (label → Clef)\n");
  for (const { title, question, label, clef, closeness: call } of disagreements) {
    console.log(`  ${title}\n    ${question}: ${String(label)} → ${String(clef)}  ${call}`);
  }
}

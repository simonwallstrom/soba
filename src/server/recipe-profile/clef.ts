import { recipeBases, recipeEfforts, recipeProteins } from "@shared/recipe-profile";
import type { RecipeProfileAnswers, recipeProfileSource } from "@shared/recipe-profile";
import * as v from "valibot";

// What meal suggestions need to know, asked of Clef, Workers AI's decision model. Each option
// describes itself, so the model reads recipes in any language the same way.
export const profileQuestions = {
  isDinner: {
    type: "noul",
    instructions:
      "Could a family eat this as their whole dinner? Soups, pancakes, porridge, and hearty salads count. Desserts, cakes, buns, bread, drinks, snacks, and side dishes don't.",
  },
  base: {
    type: "choice",
    instructions: "What is the dish's main starch, the part it's served with or built on?",
    criteria: {
      potato: "Potatoes: boiled, mashed, roasted, fried, in a gratin, or grated into pancakes",
      rice: "Rice, including risotto",
      pasta: "Pasta or noodles, including lasagna",
      bread: "Bread: a soup or stew served with bread, a sandwich, toast, or a pie crust",
      other: "Something else, like tortillas, pancakes, or other grains, or no clear starch",
    },
  },
  protein: {
    type: "choice",
    instructions: "What is the dish's main protein?",
    criteria: {
      fish: "Fish or seafood",
      chicken: "Chicken or other poultry",
      beef: "Beef, including ground beef",
      pork: "Pork, including bacon, ham, and sausages",
      vegetarian: "No meat or fish",
      other: "Other meat, like lamb or game",
    },
  },
  effort: {
    type: "score",
    instructions: "How much time and work does the dish take from start to table?",
    criteria: [
      "Quick: about 30 minutes or less, with little work",
      "Normal: under an hour, an ordinary weeknight dinner",
      "Involved: over an hour, or many steps, like a weekend project",
    ],
  },
  isTreat: {
    type: "noul",
    instructions:
      'Is this festive "Friday food" that families save for a treat, like tacos, pizza, burgers, kebab, or nachos? Everyday home cooking, like pasta, stews, casseroles, sausage dishes, and pancakes, isn\'t.',
  },
} as const;

// How sure Clef must be to answer yes, set from `bun run profile:compare` on 47 samples. Real
// dinners score 0.48 and up and everything else 0.15 or less, so a low bar keeps soups and
// pancakes. Treats score 0.90 and up and everyday dinners 0.53 or less, and a dinner wrongly
// kept for treat days is rarely suggested.
const dinnerThreshold = 0.3;
const treatThreshold = 0.7;

const probability = v.pipe(v.number(), v.minValue(0), v.maxValue(1));

// The answers Clef returns, checked rather than trusted.
const answersSchema = v.object({
  answers: v.object({
    isDinner: v.object({ noul: probability }),
    base: v.object({ choice: v.picklist(recipeBases) }),
    protein: v.object({ choice: v.picklist(recipeProteins) }),
    effort: v.object({ score: v.pipe(v.number(), v.minValue(0), v.maxValue(2)) }),
    isTreat: v.object({ noul: probability }),
  }),
});

export function profileFromAnswers(response: unknown): RecipeProfileAnswers | null {
  const result = v.safeParse(answersSchema, response);
  if (!result.success) return null;
  const { isDinner, base, protein, effort, isTreat } = result.output.answers;
  return {
    isDinner: isDinner.noul >= dinnerThreshold,
    base: base.choice,
    protein: protein.choice,
    // The score lands between levels; the nearest one is the recipe's effort.
    effort: recipeEfforts[Math.round(effort.score)] ?? "normal",
    isTreat: isTreat.noul >= treatThreshold,
  };
}

// Asks through the household's AI Gateway, so its calls show up beside imports' in the
// gateway's logs and costs. `gatewayId` is the last part of the gateway's URL.
export async function readRecipeProfile(
  ai: Ai,
  gatewayId: string,
  source: ReturnType<typeof recipeProfileSource>,
): Promise<RecipeProfileAnswers | null> {
  const response: unknown = await ai.run(
    "@cf/cloudflare/clef",
    { model: "clef", state: source, questions: profileQuestions },
    { gateway: { id: gatewayId } },
  );
  return profileFromAnswers(response);
}

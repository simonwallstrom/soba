import type { RecipeListEntry } from "@client/features/recipes/recipe-list";
import type { RecipeBase, RecipeProfile, RecipeProtein } from "@shared/meal-plan";

// What suggestions need to know about a recipe.
export type Profile = Pick<RecipeProfile, "isDinner" | "base" | "protein" | "effort" | "isTreat">;

const bases: [RecipeBase, RegExp][] = [
  ["potato", /potat|mos\b/iu],
  ["rice", /\brice\b|\bris\b|risotto/iu],
  ["pasta", /pasta|spaghetti|lasagn|penne|tagliatelle|nudlar|noodle/iu],
  ["bread", /bread|bröd|sandwich|smörgås|toast/iu],
];

const proteins: [RecipeProtein, RegExp][] = [
  ["fish", /fish|fisk|lax|salmon|torsk|cod|tonfisk|tuna|räk|shrimp|shellfish/iu],
  ["chicken", /chicken|kyckling/iu],
  ["pork", /pork|fläsk|bacon|korv|sausage|skinka|ham\b/iu],
  ["beef", /beef|nötfärs|köttfärs|biff|oxfilé/iu],
  ["vegetarian", /vegetar|vegan|halloumi|tofu|bönor|beans|lentil|linser/iu],
];

const notDinner = /dessert|baking|bakning|fika|breakfast|frukost|cookie|kaka|bulle|paj\b|pie\b/iu;
const treat = /taco|pizza|burger|hamburgare|kebab|nachos|fish and chips/iu;

// Until a model has read a recipe, a guess from its title and the household's tags, so new
// recipes are suggested right away.
export function guessProfile({ recipe, tags }: RecipeListEntry): Profile {
  const text = [recipe.title, ...tags.map((tag) => tag.name)].join(" ");
  const tagNames = tags.map((tag) => tag.name.toLowerCase());
  return {
    isDinner: !notDinner.test(text),
    base: bases.find(([, pattern]) => pattern.test(text))?.[0] ?? "other",
    protein: proteins.find(([, pattern]) => pattern.test(text))?.[0] ?? "other",
    effort: tagNames.includes("quick")
      ? "quick"
      : tagNames.includes("involved")
        ? "involved"
        : "normal",
    isTreat: treat.test(text),
  };
}

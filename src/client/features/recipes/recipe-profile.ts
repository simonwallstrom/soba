import type { RecipeListEntry } from "@client/features/recipes/recipe-list";
import type { RecipeBase, RecipeProfileAnswers, RecipeProtein } from "@shared/recipe-profile";

const bases: [RecipeBase, RegExp][] = [
  ["potato", /potat|mos\b/iu],
  ["rice", /\brice\b|\bris\b|risotto/iu],
  ["pasta", /pasta|spaghetti|lasagn|penne|tagliatelle|nudlar|noodle/iu],
  // A pie crust counts as bread, as in Clef's questions.
  ["bread", /bread|bröd|sandwich|smörgås|toast|paj\b|pie\b|quiche/iu],
];

const proteins: [RecipeProtein, RegExp][] = [
  ["fish", /fish|fisk|lax|salmon|torsk|cod|tonfisk|tuna|räk|shrimp|shellfish/iu],
  ["chicken", /chicken|kyckling/iu],
  ["pork", /pork|fläsk|bacon|korv|sausage|skink|ham\b/iu],
  ["beef", /beef|nötfärs|köttfärs|biff|oxfilé/iu],
  ["vegetarian", /vegetar|vegan|halloumi|tofu|bönor|beans|lentil|linser/iu],
];

// Sweet pies are desserts; savory ones, like a ham or leek pie, are dinner.
const notDinner =
  /dessert|baking|bakning|fika|breakfast|frukost|cookie|(?<!pann)kak(a|or)\b|bull(e|ar)\b|(äppel|bär|rabarber)s?paj|(apple|berry|cherry|rhubarb|pecan|pumpkin) pie/iu;
const treat = /taco|pizza|burger|hamburgare|kebab|nachos|fish and chips/iu;

// Until the server has read a recipe with a model, a guess from its title and the household's tags, so new
// recipes are suggested right away.
export function guessProfile({ recipe, tags }: RecipeListEntry): RecipeProfileAnswers {
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

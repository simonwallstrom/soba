import { recipeProfiles$, recipes$ } from "@client/features/recipes/queries";
import type { RecipeListEntry } from "@client/features/recipes/recipe-list";
import { api } from "@client/lib/api";
import type { Store } from "@livestore/livestore";
import {
  recipeProfiled,
  recipeProfileSource,
  recipeProfileSourceHash,
  recipeProfileVersion,
} from "@shared/recipe-profile";
import type {
  RecipeBase,
  RecipeProfile,
  RecipeProfileAnswers,
  RecipeProtein,
} from "@shared/recipe-profile";
import { recipeSchema } from "@shared/recipes";
import type { Recipe, RecipeSection } from "@shared/recipes";

// How long a recipe someone else saved waits before this member reads it, so the member who
// saved it, whose browser reads it right away, isn't raced. Covers their tab closing too soon.
const othersGraceMs = 2 * 60_000;

// The API takes mutable arrays.
function copySection(section: RecipeSection) {
  return { ...section, items: [...section.items] };
}

// Whether a recipe has no profile, or one read from older questions or an older version of it.
export function needsProfile(recipe: Recipe, profile: RecipeProfile | undefined) {
  return (
    !profile ||
    profile.version < recipeProfileVersion ||
    profile.sourceHash !== recipeProfileSourceHash(recipeProfileSource(recipe))
  );
}

// When this member should read a recipe that needs a profile: right away if they saved it last,
// otherwise after the grace period.
export function profileDueAt(recipe: Recipe, userId: string) {
  return recipe.updatedBy === userId ? 0 : recipe.updatedAt.getTime() + othersGraceMs;
}

// Recipes in the store that need a profile, with when each is due for this member.
export function recipesToProfile(store: Store<typeof recipeSchema>, userId: string) {
  const profiles = new Map(store.query(recipeProfiles$).map((row) => [row.recipeId, row]));
  return store
    .query(recipes$)
    .filter((recipe) => needsProfile(recipe, profiles.get(recipe.id)))
    .map((recipe) => ({ recipe, dueAt: profileDueAt(recipe, userId) }));
}

// Reads a recipe with a model and saves its profile for the household. Nobody waits for it or
// sees it; until it's saved, suggestions guess from the recipe's title and tags.
export async function profileRecipe(
  store: Store<typeof recipeSchema>,
  recipe: Recipe,
): Promise<"saved" | "failed" | "rate-limited"> {
  const source = recipeProfileSource(recipe);
  try {
    const response = await api["recipe-profile"].$post({
      json: {
        title: source.title,
        ...(source.description ? { description: source.description } : {}),
        ingredients: source.ingredients.map(copySection),
        instructions: source.instructions.map(copySection),
      },
    });
    // The rate limit is middleware, which the client's response types don't include.
    const status: number = response.status;
    if (!response.ok) return status === 429 ? "rate-limited" : "failed";
    const { profile, version } = await response.json();
    // The hash of what was sent: if the recipe changed meanwhile, it's read again.
    store.commit(
      recipeProfiled({
        recipeId: recipe.id,
        ...profile,
        version,
        sourceHash: recipeProfileSourceHash(source),
        profiledAt: new Date(),
      }),
    );
    return "saved";
  } catch {
    return "failed";
  }
}

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

// Until a model has read a recipe, a guess from its title and the household's tags, so new
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

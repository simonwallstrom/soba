import { recipeProfiles$, recipes$ } from "@client/features/recipes/queries";
import { api } from "@client/lib/api";
import type { Store } from "@livestore/livestore";
import {
  recipeProfiled,
  recipeProfileSource,
  recipeProfileSourceHash,
  recipeProfileVersion,
} from "@shared/meal-plan";
import type { RecipeProfile } from "@shared/meal-plan";
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

import { recipe$ } from "@client/features/recipes/queries";
import { api } from "@client/lib/api";
import type { Store } from "@livestore/livestore";
import { recipeProfiled, recipeProfileSource } from "@shared/meal-plan";
import { recipeSchema } from "@shared/recipes";
import type { Recipe, RecipeSection } from "@shared/recipes";

// The API takes mutable arrays.
function copySection(section: RecipeSection) {
  return { ...section, items: [...section.items] };
}

// Whether an edit changed what a recipe's profile is read from.
export function changesProfile(before: Recipe, after: Recipe) {
  return JSON.stringify(recipeProfileSource(before)) !== JSON.stringify(recipeProfileSource(after));
}

// Reads a just-saved recipe in the background, so meal suggestions know what it is, and saves
// the profile for the household. Nobody waits for it or sees it; if it fails, suggestions guess
// from the recipe's title and tags instead.
export async function profileRecipe(store: Store<typeof recipeSchema>, recipeId: string) {
  const recipe = store.query(recipe$(recipeId));
  if (!recipe) return;
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
    if (!response.ok) return;
    const { profile } = await response.json();
    store.commit(recipeProfiled({ recipeId, ...profile, profiledAt: new Date() }));
  } catch {
    // Offline or unreachable; the guess will do.
  }
}

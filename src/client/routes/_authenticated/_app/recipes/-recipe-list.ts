import { compareNames } from "@client/features/recipes/recipe-tags";
import type { Recipe, RecipeSort, Tag } from "@shared/recipes";

// Each filter field holds the IDs it matches.
export const recipeFilterFields = ["tags", "authors"] as const;
export type RecipeFilterField = (typeof recipeFilterFields)[number];
export type RecipeFilters = Partial<Record<RecipeFilterField, string[]>>;

// The search text stays as typed; matching ignores surrounding spaces and case.
export type RecipeListFilters = RecipeFilters & { q?: string };

function parseIds(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.filter((item): item is string => typeof item === "string"))];
}

// Keeps only well-formed search params, so a hand-edited URL never breaks the page. A recipe
// has one author, so the filter picks one; a link naming several keeps the first.
export function parseRecipeListSearch(search: Record<string, unknown>): RecipeListFilters {
  const result: RecipeListFilters = {};
  for (const field of recipeFilterFields) {
    const ids = parseIds(search[field]).slice(0, field === "authors" ? 1 : undefined);
    if (ids.length > 0) result[field] = ids;
  }
  const q = search["q"];
  if (typeof q === "string" && q.trim() !== "") result.q = q;
  return result;
}

function normalize(text: string) {
  return text.trim().toLocaleLowerCase("sv");
}

// The text a search looks through: title, description, tag names, and ingredient lines.
function searchableText(recipe: Recipe, tags: readonly Tag[]) {
  return [
    recipe.title,
    recipe.description ?? "",
    ...tags.map((tag) => tag.name),
    ...recipe.ingredients.flatMap((section) => section.items),
  ].map(normalize);
}

// A recipe matches the search, every selected tag (each one narrows the list), the selected
// author, and so every field with a selection.
export function filterRecipes(
  recipes: readonly Recipe[],
  tagsByRecipe: ReadonlyMap<string, readonly Tag[]>,
  filters: RecipeListFilters,
  sort: RecipeSort,
) {
  const { tags = [], authors = [] } = filters;
  const query = normalize(filters.q ?? "");
  const matches = recipes.filter(
    (recipe) =>
      (query === "" ||
        searchableText(recipe, tagsByRecipe.get(recipe.id) ?? []).some((text) =>
          text.includes(query),
        )) &&
      tags.every((id) => (tagsByRecipe.get(recipe.id) ?? []).some((tag) => tag.id === id)) &&
      (authors.length === 0 || authors.includes(recipe.createdBy)),
  );
  return matches.toSorted((left, right) => {
    if (sort === "created") {
      const byDate = right.createdAt.getTime() - left.createdAt.getTime();
      if (byDate !== 0) return byDate;
    }
    if (sort === "updated") {
      const byDate = right.updatedAt.getTime() - left.updatedAt.getTime();
      if (byDate !== 0) return byDate;
    }
    return compareNames(left.title, right.title);
  });
}

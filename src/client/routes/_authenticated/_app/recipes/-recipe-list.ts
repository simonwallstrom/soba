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

// Keeps only well-formed search params, so a hand-edited URL never breaks the page.
export function parseRecipeListSearch(search: Record<string, unknown>): RecipeListFilters {
  const result: RecipeListFilters = {};
  for (const field of recipeFilterFields) {
    const ids = parseIds(search[field]);
    if (ids.length > 0) result[field] = ids;
  }
  const q = search["q"];
  if (typeof q === "string" && q.trim() !== "") result.q = q;
  return result;
}

export function hasRecipeFilters(filters: RecipeFilters) {
  return recipeFilterFields.some((field) => (filters[field]?.length ?? 0) > 0);
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

// A recipe matches the search, any selected value within a field, and every field with a
// selection.
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
      (tags.length === 0 ||
        (tagsByRecipe.get(recipe.id) ?? []).some((tag) => tags.includes(tag.id))) &&
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

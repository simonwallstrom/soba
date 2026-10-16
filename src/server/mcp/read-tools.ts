import { mealHistory } from "@shared/meal-plan";
import type { RecipeSection } from "@shared/recipes";

import { listMembers } from "../household/household";
import type { Membership } from "../household/household";
import { listMeals } from "../meal-plan/meal-plan";
import { listRecipes } from "../recipes/recipes";

// What the read-only MCP tools answer, built from the same queries as the app's API. Answers are
// plain JSON for the model to read: names rather than IDs where it helps, and links to the app.

type Household = Pick<Membership, "id" | "name" | "language" | "units">;

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Days are calendar dates like "2026-10-12"; see mealDatePattern. */
export function addDays(date: string, days: number) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export function weekday(date: string) {
  return weekdays[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

// Lowercase without accents, so "creme" finds "Crème" and "kal" finds "kål".
function searchable(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("sv-SE");
}

function sectionLines(sections: readonly RecipeSection[]) {
  return sections.flatMap(({ heading, items }) => (heading ? [heading, ...items] : items));
}

async function loadRecipes(household: Household, userId: string) {
  const { recipes, tags } = await listRecipes(household.id, userId);
  const tagNames = new Map(tags.map((tag) => [tag.id, tag.name]));
  return {
    recipes: recipes.map((recipe) => ({
      ...recipe,
      tags: recipe.tagIds.flatMap((id) => tagNames.get(id) ?? []),
    })),
    tags: tags.map((tag) => tag.name).toSorted((a, b) => a.localeCompare(b, "sv-SE")),
  };
}

export async function getHousehold(household: Household, userId: string) {
  const [members, { recipes, tags }] = await Promise.all([
    listMembers(household.id),
    loadRecipes(household, userId),
  ]);
  return {
    name: household.name,
    language: household.language,
    units: household.units,
    members: members.map(({ id, name, role }) => ({ name, role, isYou: id === userId })),
    recipeCount: recipes.length,
    tags: tags.map((name) => ({
      name,
      recipes: recipes.filter((recipe) => recipe.tags.includes(name)).length,
    })),
  };
}

// Full recipes are long, so a search returns at most this many of them at once.
export const maxFullRecipes = 50;

export async function searchRecipes(
  household: Household,
  userId: string,
  { appUrl, today }: { appUrl: string; today: string },
  {
    query,
    tag,
    limit,
    full = false,
  }: {
    query?: string | undefined;
    tag?: string | undefined;
    limit: number;
    full?: boolean | undefined;
  },
) {
  const [{ recipes }, meals] = await Promise.all([
    loadRecipes(household, userId),
    listMeals(household.id),
  ]);
  const { lastEaten, nextPlanned } = mealHistory(meals, today);

  const terms = searchable(query ?? "")
    .split(/\s+/u)
    .filter(Boolean);
  const wantedTag = tag ? searchable(tag) : null;
  const matches = recipes
    .filter((recipe) => !wantedTag || recipe.tags.some((name) => searchable(name) === wantedTag))
    .map((recipe) => {
      const title = searchable(recipe.title);
      const rest = searchable(
        [recipe.description ?? "", ...recipe.tags, ...sectionLines(recipe.ingredients)].join("\n"),
      );
      const found = terms.every((term) => title.includes(term) || rest.includes(term));
      return { recipe, found, inTitle: terms.some((term) => title.includes(term)) };
    })
    .filter(({ found }) => found)
    // Title matches first, then by name.
    .toSorted(
      (a, b) =>
        Number(b.inTitle) - Number(a.inTitle) ||
        a.recipe.title.localeCompare(b.recipe.title, "sv-SE"),
    );

  const shown = matches.slice(0, full ? Math.min(limit, maxFullRecipes) : limit);
  return {
    total: matches.length,
    ...(shown.length < matches.length && {
      note: `Showing ${shown.length} of ${matches.length}. Narrow the search, or raise the limit${full ? ` (at most ${maxFullRecipes} with full)` : ""}.`,
    }),
    recipes: shown.map(({ recipe }) => ({
      id: recipe.id,
      title: recipe.title,
      tags: recipe.tags,
      servings: recipe.servings,
      lastEaten: lastEaten.get(recipe.id) ?? null,
      nextPlanned: nextPlanned.get(recipe.id) ?? null,
      url: `${appUrl}/recipes/${recipe.id}`,
      ...(full && {
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
      }),
    })),
  };
}

export async function getRecipe(household: Household, userId: string, appUrl: string, id: string) {
  const [{ recipes }, members] = await Promise.all([
    loadRecipes(household, userId),
    listMembers(household.id),
  ]);
  const recipe = recipes.find((candidate) => candidate.id === id);
  if (!recipe) return null;
  const memberName = (memberId: string) =>
    members.find((member) => member.id === memberId)?.name ?? "A former member";
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    tags: recipe.tags,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    sourceUrl: recipe.sourceUrl,
    // Photos need a member's session to load, so Claude only learns whether there is one.
    hasPhoto: recipe.imageUrl !== null,
    createdBy: memberName(recipe.createdBy),
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    url: `${appUrl}/recipes/${recipe.id}`,
  };
}

export async function getMealPlan(
  household: Household,
  userId: string,
  { from, to }: { from: string; to: string },
) {
  const [{ recipes }, meals, members] = await Promise.all([
    loadRecipes(household, userId),
    listMeals(household.id),
    listMembers(household.id),
  ]);
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  return {
    from,
    to,
    meals: meals
      .filter((meal) => meal.date >= from && meal.date <= to)
      .toSorted((a, b) => a.date.localeCompare(b.date))
      .flatMap((meal) => {
        const recipe = recipesById.get(meal.recipeId);
        if (!recipe) return [];
        return [
          {
            date: meal.date,
            weekday: weekday(meal.date),
            recipe: { id: recipe.id, title: recipe.title, tags: recipe.tags },
            plannedBy: memberNames.get(meal.plannedBy) ?? "A former member",
          },
        ];
      }),
  };
}

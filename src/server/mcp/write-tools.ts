import { recipePhotoUrl, sameTagName } from "@shared/recipes";
import type { RecipeSection, Tag } from "@shared/recipes";

import type { Membership } from "../household/household";
import { listMeals, planMeals, unplanMeals } from "../meal-plan/meal-plan";
import { downloadPhoto } from "../photos/download";
import { deleteRecipePhoto } from "../photos/photo";
import {
  createRecipe,
  deleteRecipe,
  findRecipeBySource,
  listRecipes,
  updateRecipe,
} from "../recipes/recipes";
import { createTag, deleteTag, mergeTag, renameTag } from "../tags/tags";
import { addDays, weekday } from "./read-tools";

// What the MCP tools that change data do, with the same queries as the app's API. They answer
// with what changed, or a message Claude can act on, rather than throwing.

export type WriteContext = {
  household: Pick<Membership, "id">;
  userId: string;
  appUrl: string;
  /** The household's photos, for images Claude links to and ones recipes no longer use. */
  photos: R2Bucket;
  today: string;
};

type Outcome<T> = { ok: true; value: T } | { ok: false; error: string };

export type SectionInput = { heading?: string | null | undefined; items: string[] };

export type RecipeFields = {
  title: string;
  description?: string | null | undefined;
  servings?: number | null | undefined;
  ingredients: SectionInput[];
  instructions: SectionInput[];
  tags?: string[] | undefined;
  imageUrl?: string | null | undefined;
};

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

// Trimmed lines, without empty lines or sections, as the import's cleanup leaves them.
function cleanSections(sections: readonly SectionInput[]): RecipeSection[] {
  return sections.flatMap((section) => {
    const items = section.items.map((item) => item.trim()).filter(Boolean);
    if (items.length === 0) return [];
    const heading = section.heading?.trim();
    return [heading ? { heading, items } : { items }];
  });
}

// The household's tags by name. Saving a recipe never makes new ones; create_tag does, so a
// tag is added on purpose rather than invented by an import.
function matchTags(names: readonly string[], tags: readonly Tag[]) {
  const tagIds = new Set<string>();
  const unknown: string[] = [];
  for (const name of names) {
    const tag = tags.find((candidate) => sameTagName(candidate.name, name));
    if (tag) tagIds.add(tag.id);
    else unknown.push(name);
  }
  return { tagIds: [...tagIds], unknown };
}

function ignoredTags(unknown: readonly string[]) {
  return unknown.length > 0
    ? {
        ignoredTags: unknown,
        note: "The household has no tags by those names, so they were left out. Add one with create_tag if the member wants it.",
      }
    : {};
}

// Copies an image Claude linked to into the household's photos, so the recipe doesn't depend on
// another site keeping it. A recipe is saved without it when that fails, and the answer says why.
async function savePhoto(
  context: WriteContext,
  imageUrl: string,
): Promise<{ imageUrl: string } | { imageUrl: null; photoNote: string }> {
  const result = await downloadPhoto(
    context.photos,
    { householdId: context.household.id, uploadedBy: context.userId },
    imageUrl,
  );
  return "photoId" in result
    ? { imageUrl: recipePhotoUrl(result.photoId) }
    : { imageUrl: null, photoNote: `The photo wasn't saved: ${result.error}` };
}

function recipeUrl(context: WriteContext, id: string) {
  return `${context.appUrl}/recipes/${id}`;
}

export async function createMcpRecipe(
  context: WriteContext,
  {
    sourceUrl,
    allowDuplicate = false,
    ...fields
  }: RecipeFields & { sourceUrl?: string | undefined; allowDuplicate?: boolean | undefined },
): Promise<Outcome<object>> {
  const { household, userId } = context;
  const title = fields.title.trim();
  if (!title) return fail("Give the recipe a title.");
  const ingredients = cleanSections(fields.ingredients);
  const instructions = cleanSections(fields.instructions);
  if (ingredients.length === 0 && instructions.length === 0) {
    return fail("A recipe needs ingredients or instructions.");
  }
  if (sourceUrl && !allowDuplicate) {
    const existing = await findRecipeBySource(household.id, sourceUrl);
    if (existing) {
      return fail(
        `"${existing.title}" (ID ${existing.id}) is already saved from that page: ${recipeUrl(context, existing.id)}. Change it with update_recipe, or pass allowDuplicate to save another copy.`,
      );
    }
  }
  const { tags } = await listRecipes(household.id, userId);
  const { tagIds, unknown } = matchTags(fields.tags ?? [], tags);
  const photo = fields.imageUrl ? await savePhoto(context, fields.imageUrl) : { imageUrl: null };
  const id = crypto.randomUUID();
  await createRecipe(household.id, userId, {
    id,
    title,
    description: fields.description?.trim() || null,
    servings: fields.servings ?? null,
    ingredients,
    instructions,
    tagIds,
    newTags: [],
    imageUrl: photo.imageUrl,
    sourceUrl: sourceUrl ?? null,
  });
  return {
    ok: true,
    value: {
      id,
      title,
      url: recipeUrl(context, id),
      ...("photoNote" in photo ? { photoNote: photo.photoNote } : {}),
      ...ignoredTags(unknown),
    },
  };
}

// Changes only the fields given. Tags, when given, replace the recipe's tags; null clears the
// description, servings, or photo.
export async function updateMcpRecipe(
  context: WriteContext,
  id: string,
  changes: { [Key in keyof RecipeFields]?: RecipeFields[Key] | undefined },
): Promise<Outcome<object>> {
  const { household, userId } = context;
  const { recipes, tags } = await listRecipes(household.id, userId);
  const current = recipes.find((recipe) => recipe.id === id);
  if (!current) return fail("No recipe with that ID in this household.");
  const ingredients = changes.ingredients
    ? cleanSections(changes.ingredients)
    : current.ingredients;
  const instructions = changes.instructions
    ? cleanSections(changes.instructions)
    : current.instructions;
  if (ingredients.length === 0 && instructions.length === 0) {
    return fail("A recipe needs ingredients or instructions.");
  }
  const { tagIds, unknown } = changes.tags
    ? matchTags(changes.tags, tags)
    : { tagIds: current.tagIds, unknown: [] };
  const title = changes.title === undefined ? current.title : changes.title.trim();
  if (!title) return fail("Give the recipe a title.");
  // A photo that can't be saved leaves the current one.
  const photo = changes.imageUrl
    ? await savePhoto(context, changes.imageUrl)
    : { imageUrl: changes.imageUrl };
  const updated = await updateRecipe(household.id, userId, id, {
    title,
    description:
      changes.description === undefined ? current.description : changes.description?.trim() || null,
    servings: changes.servings === undefined ? current.servings : changes.servings,
    ingredients,
    instructions,
    tagIds,
    newTags: [],
    imageUrl: "photoNote" in photo ? undefined : photo.imageUrl,
  });
  if (!updated) return fail("No recipe with that ID in this household.");
  await deleteRecipePhoto(context.photos, household.id, updated.unusedImageUrl);
  return {
    ok: true,
    value: {
      id,
      title,
      url: recipeUrl(context, id),
      changed: Object.keys(changes),
      ...("photoNote" in photo ? { photoNote: photo.photoNote } : {}),
      ...ignoredTags(unknown),
    },
  };
}

export async function deleteMcpRecipe(context: WriteContext, id: string): Promise<Outcome<object>> {
  const { household, userId } = context;
  const [{ recipes }, planned] = await Promise.all([
    listRecipes(household.id, userId),
    listMeals(household.id),
  ]);
  const recipe = recipes.find((candidate) => candidate.id === id);
  const deleted = recipe && (await deleteRecipe(household.id, id));
  if (!deleted) return fail("No recipe with that ID in this household.");
  await deleteRecipePhoto(context.photos, household.id, deleted.unusedImageUrl);
  const days = planned.filter((meal) => meal.recipeId === id).map((meal) => meal.date);
  return {
    ok: true,
    value: {
      deleted: recipe.title,
      removedFromMealPlan: days.filter((date) => date >= context.today).toSorted(),
      pastDinnersRemoved: days.filter((date) => date < context.today).length,
    },
  };
}

// The first day Claude may change. Yesterday rather than today, since "today" is the UTC date
// and the household's own day may still be the one before.
function checkDays(context: WriteContext, dates: readonly string[]) {
  const earliest = addDays(context.today, -1);
  const past = dates.filter((date) => date < earliest);
  if (past.length > 0) return `Days that have passed can't change: ${past.join(", ")}.`;
  if (new Set(dates).size !== dates.length) return "Give each date once.";
  return null;
}

export async function planMcpMeals(
  context: WriteContext,
  meals: readonly { date: string; recipeId: string }[],
): Promise<Outcome<object>> {
  const { household, userId } = context;
  const problem = checkDays(
    context,
    meals.map((meal) => meal.date),
  );
  if (problem) return fail(problem);
  const [{ recipes }, planned] = await Promise.all([
    listRecipes(household.id, userId),
    listMeals(household.id),
  ]);
  const titles = new Map(recipes.map((recipe) => [recipe.id, recipe.title]));
  const unknown = meals.filter((meal) => !titles.has(meal.recipeId));
  if (unknown.length > 0) {
    return fail(
      `No recipe in this household with the ID ${unknown.map((meal) => meal.recipeId).join(", ")}.`,
    );
  }
  if (!(await planMeals(household.id, userId, [...meals]))) {
    return fail("A recipe was deleted meanwhile. Search again and retry.");
  }
  const dates = new Set(meals.map((meal) => meal.date));
  return {
    ok: true,
    value: {
      planned: meals
        .toSorted((a, b) => a.date.localeCompare(b.date))
        .map(({ date, recipeId }) => ({
          date,
          weekday: weekday(date),
          recipe: titles.get(recipeId),
        })),
      replaced: planned
        .filter((meal) => dates.has(meal.date))
        .map(({ date, recipeId }) => ({ date, recipe: titles.get(recipeId) ?? null })),
    },
  };
}

export async function clearMcpDays(
  context: WriteContext,
  dates: readonly string[],
): Promise<Outcome<object>> {
  const { household, userId } = context;
  const problem = checkDays(context, dates);
  if (problem) return fail(problem);
  const [{ recipes }, planned] = await Promise.all([
    listRecipes(household.id, userId),
    listMeals(household.id),
  ]);
  const titles = new Map(recipes.map((recipe) => [recipe.id, recipe.title]));
  const cleared = planned.filter((meal) => dates.includes(meal.date));
  await unplanMeals(household.id, [...dates]);
  return {
    ok: true,
    value: {
      cleared: cleared
        .toSorted((a, b) => a.date.localeCompare(b.date))
        .map(({ date, recipeId }) => ({ date, recipe: titles.get(recipeId) ?? null })),
      alreadyEmpty: dates.filter((date) => !cleared.some((meal) => meal.date === date)),
    },
  };
}

const tagErrors = {
  "not-found": "The household has no tag by that name.",
  "name-taken": "The household already has a tag by that name. Merge into it with merge_tags.",
  "id-taken": "Try again.",
} as const;

// The household's tags with how many recipes use each, for answers about what changed.
async function loadTags(context: WriteContext) {
  const { recipes, tags } = await listRecipes(context.household.id, context.userId);
  const find = (name: string) => tags.find((tag) => sameTagName(tag.name, name));
  const recipeCount = (id: string) => recipes.filter((recipe) => recipe.tagIds.includes(id)).length;
  return { find, recipeCount };
}

export async function createMcpTag(context: WriteContext, name: string): Promise<Outcome<object>> {
  const error = await createTag(context.household.id, { id: crypto.randomUUID(), name });
  if (error) return fail(tagErrors[error]);
  const { find } = await loadTags(context);
  return { ok: true, value: { created: find(name)?.name ?? name } };
}

export async function renameMcpTag(
  context: WriteContext,
  name: string,
  newName: string,
): Promise<Outcome<object>> {
  const { find, recipeCount } = await loadTags(context);
  const tag = find(name);
  if (!tag) return fail(tagErrors["not-found"]);
  const error = await renameTag(context.household.id, tag.id, newName);
  if (error) return fail(tagErrors[error]);
  const renamed = (await loadTags(context)).find(newName)?.name ?? newName;
  return { ok: true, value: { renamed: tag.name, to: renamed, recipes: recipeCount(tag.id) } };
}

export async function mergeMcpTags(
  context: WriteContext,
  name: string,
  intoName: string,
): Promise<Outcome<object>> {
  const { find } = await loadTags(context);
  const [tag, into] = [find(name), find(intoName)];
  if (!tag || !into) return fail(tagErrors["not-found"]);
  if (tag.id === into.id) return fail("Those are the same tag.");
  const error = await mergeTag(context.household.id, tag.id, into.id);
  if (error) return fail(tagErrors[error]);
  return {
    ok: true,
    value: {
      merged: tag.name,
      into: into.name,
      recipes: (await loadTags(context)).recipeCount(into.id),
    },
  };
}

export async function deleteMcpTag(context: WriteContext, name: string): Promise<Outcome<object>> {
  const { find, recipeCount } = await loadTags(context);
  const tag = find(name);
  if (!tag) return fail(tagErrors["not-found"]);
  const error = await deleteTag(context.household.id, tag.id);
  if (error) return fail(tagErrors[error]);
  return { ok: true, value: { deleted: tag.name, removedFromRecipes: recipeCount(tag.id) } };
}

import { createRow, rowsToSections, sectionsToRows } from "@client/features/recipes/recipe-rows";
import type { RecipeRow } from "@client/features/recipes/recipe-rows";
import { recipeCreated, recipeUpdated, tagCreated } from "@shared/recipes";
import type { Recipe } from "@shared/recipes";

// A recipe as it is written, before it is saved. Tags created while writing are only
// committed with the recipe, so an abandoned draft leaves no stray tags behind.
export type RecipeDraft = {
  title: string;
  description: string;
  servings: number | null;
  tagIds: string[];
  newTags: { id: string; name: string }[];
  ingredients: RecipeRow[];
  instructions: RecipeRow[];
};

export function createRecipeDraft(): RecipeDraft {
  return {
    title: "",
    description: "",
    servings: null,
    tagIds: [],
    newTags: [],
    ingredients: [createRow()],
    instructions: [createRow()],
  };
}

// A saved recipe, ready to edit.
export function recipeToDraft(recipe: Recipe, tagIds: readonly string[]): RecipeDraft {
  return {
    title: recipe.title,
    description: recipe.description ?? "",
    servings: recipe.servings,
    tagIds: [...tagIds],
    newTags: [],
    ingredients: sectionsToRows(recipe.ingredients),
    instructions: sectionsToRows(recipe.instructions),
  };
}

// Whether leaving would lose anything worth asking about.
export function hasDraftContent(draft: RecipeDraft) {
  return (
    draft.title.trim() !== "" ||
    draft.description.trim() !== "" ||
    draft.servings !== null ||
    draft.tagIds.length > 0 ||
    rowsToSections(draft.ingredients).length > 0 ||
    rowsToSections(draft.instructions).length > 0
  );
}

// Whether saving an edited draft would change the recipe it started from. Blank lines and
// spaces at the ends do not count, and neither does the order tags were picked in.
export function hasDraftChanges(draft: RecipeDraft, original: RecipeDraft) {
  const values = (current: RecipeDraft) => {
    const fields = draftFields(current);
    return JSON.stringify({ ...fields, tagIds: fields.tagIds.toSorted() });
  };
  return values(draft) !== values(original);
}

// The events that save a draft as a new recipe: any new tags it uses, then the recipe.
// The caller checks that the title is not blank.
export function recipeDraftEvents(
  draft: RecipeDraft,
  { id, createdBy, createdAt }: { id: string; createdBy: string; createdAt: Date },
) {
  return [
    ...newTagEvents(draft, createdAt),
    recipeCreated({ id, ...draftFields(draft), createdBy, createdAt }),
  ];
}

// The events that save an edited draft over the recipe: any new tags it uses, then the recipe.
// The caller checks that the title is not blank.
export function recipeEditEvents(
  draft: RecipeDraft,
  { id, updatedBy, updatedAt }: { id: string; updatedBy: string; updatedAt: Date },
) {
  return [
    ...newTagEvents(draft, updatedAt),
    recipeUpdated({ id, ...draftFields(draft), updatedBy, updatedAt }),
  ];
}

// What a draft saves as, with empty optional fields left out.
function draftFields(draft: RecipeDraft) {
  const description = draft.description.trim();
  return {
    title: draft.title.trim(),
    ...(description === "" ? {} : { description }),
    ...(draft.servings === null ? {} : { servings: draft.servings }),
    ingredients: rowsToSections(draft.ingredients),
    instructions: rowsToSections(draft.instructions),
    tagIds: draft.tagIds,
  };
}

function newTagEvents(draft: RecipeDraft, createdAt: Date) {
  return draft.newTags
    .filter((tag) => draft.tagIds.includes(tag.id))
    .map((tag) => tagCreated({ id: tag.id, name: tag.name, createdAt }));
}

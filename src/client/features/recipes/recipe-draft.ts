import { createRow, rowsToSections } from "@client/features/recipes/recipe-rows";
import type { RecipeRow } from "@client/features/recipes/recipe-rows";
import { recipeCreated, tagCreated } from "@shared/recipes";

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

// The events that save a draft as a new recipe: any new tags it uses, then the recipe.
// The caller checks that the title is not blank.
export function recipeDraftEvents(
  draft: RecipeDraft,
  { id, createdBy, createdAt }: { id: string; createdBy: string; createdAt: Date },
) {
  const description = draft.description.trim();
  const ingredients = rowsToSections(draft.ingredients);
  const instructions = rowsToSections(draft.instructions);

  return [
    ...draft.newTags
      .filter((tag) => draft.tagIds.includes(tag.id))
      .map((tag) => tagCreated({ id: tag.id, name: tag.name, createdAt })),
    recipeCreated({
      id,
      title: draft.title.trim(),
      ...(description === "" ? {} : { description }),
      ...(draft.servings === null ? {} : { servings: draft.servings }),
      ingredients,
      instructions,
      tagIds: draft.tagIds,
      createdBy,
      createdAt,
    }),
  ];
}

import { recipeCreated, tagCreated } from "@shared/recipes";

import { sampleRecipes } from "./sample-recipes";

// The events that add every sample recipe and its tags, all added by one user.
export function sampleRecipeEvents(userId: string, now = new Date()) {
  const tagIds = new Map(
    [...new Set(sampleRecipes.flatMap((recipe) => recipe.tags))].map((name) => [
      name,
      crypto.randomUUID(),
    ]),
  );

  return [
    ...[...tagIds].map(([name, id]) => tagCreated({ id, name, createdAt: now })),
    ...sampleRecipes.map(({ tags, createdAt, servings, ...recipe }) =>
      recipeCreated({
        ...recipe,
        id: crypto.randomUUID(),
        ...(servings === null ? {} : { servings }),
        tagIds: tags.flatMap((name) => tagIds.get(name) ?? []),
        createdBy: userId,
        createdAt: new Date(createdAt),
      }),
    ),
  ];
}

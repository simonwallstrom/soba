import type { Collection } from "@shared/recipes";

// What the collection form edits. A blank description is stored as none.
export type CollectionValues = { title: string; description: string | null };

export function normalizeCollectionValues(values: CollectionValues): CollectionValues {
  const description = values.description?.trim() ?? "";
  return { title: values.title.trim(), description: description === "" ? null : description };
}

// The fields an edit changes, or null when it changes nothing.
export function changedCollectionValues(
  collection: Pick<Collection, "title" | "description">,
  values: CollectionValues,
): Partial<CollectionValues> | null {
  const { title, description } = normalizeCollectionValues(values);
  const changes = {
    ...(title === collection.title ? {} : { title }),
    ...(description === collection.description ? {} : { description }),
  };
  return Object.keys(changes).length === 0 ? null : changes;
}

export function formatRecipeCount(count: number) {
  return `${count} ${count === 1 ? "recipe" : "recipes"}`;
}

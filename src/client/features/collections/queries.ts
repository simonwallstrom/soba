import { queryDb } from "@livestore/livestore";
import { collectionListSettings, collectionRecipes, collections } from "@shared/recipes";

export const collections$ = queryDb(collections.where({ deletedAt: null }), {
  label: "collections",
});

export const collectionRecipes$ = queryDb(collectionRecipes.select(), {
  label: "collectionRecipes",
});

export function collection$(collectionId: string) {
  return queryDb(collections.where({ id: collectionId, deletedAt: null }).first(), {
    label: "collection",
    deps: [collectionId],
  });
}

export const collectionListSettings$ = queryDb(collectionListSettings.get(), {
  label: "collectionListSettings",
});

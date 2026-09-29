import { adapter } from "@client/lib/livestore/adapter";
import type { RegistryStoreOptions } from "@livestore/livestore";
import { storeOptions } from "@livestore/react";
import { householdStoreId } from "@shared/household";
import { recipeSchema } from "@shared/recipes";

export function householdStoreOptions(
  householdId: string,
): RegistryStoreOptions<typeof recipeSchema> {
  return storeOptions({ storeId: householdStoreId(householdId), schema: recipeSchema, adapter });
}

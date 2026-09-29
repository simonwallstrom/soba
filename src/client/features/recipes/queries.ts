import { queryDb } from "@livestore/livestore";
import { recipes } from "@shared/recipes";

export const recipes$ = queryDb(recipes.orderBy("createdAt", "desc"), { label: "recipes" });

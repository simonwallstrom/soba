import type { RecipeSection } from "@shared/recipes";

// A recipe read from a page or photos, cleaned to what the recipe form allows.
export type ImportedRecipe = {
  title: string;
  description: string;
  servings: number | null;
  ingredients: RecipeSection[];
  instructions: RecipeSection[];
  // Names of the household's own tags that fit; never new ones.
  tags: string[];
};

// Reading the page or photos, writing the recipe, waiting for the browser to save it, or failed.
export type RecipeImportStatus = "reading" | "writing" | "ready" | "failed";

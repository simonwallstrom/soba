import { Events, Schema, State } from "@livestore/livestore";

import type { RecipeSection } from "./recipes";

// What meal suggestions know about each recipe: a profile a model reads from the recipe in the
// background. See docs/ai-and-meal-planning.md.

export const recipeBases = ["potato", "rice", "pasta", "bread", "other"] as const;
export type RecipeBase = (typeof recipeBases)[number];
export const recipeProteins = ["fish", "chicken", "beef", "pork", "vegetarian", "other"] as const;
export type RecipeProtein = (typeof recipeProteins)[number];
export const recipeEfforts = ["quick", "normal", "involved"] as const;
export type RecipeEffort = (typeof recipeEfforts)[number];

// What meal suggestions know about a recipe, read from its title, ingredients, and steps by a
// model in the background. Never shown, and separate from tags, which stay the household's own.
export const recipeProfiles = State.SQLite.table({
  name: "recipe_profiles",
  columns: {
    recipeId: State.SQLite.text({ primaryKey: true }),
    // Whether it's a dinner at all, not a dessert, bread, or breakfast.
    isDinner: State.SQLite.boolean(),
    base: State.SQLite.text({ schema: Schema.Literal(...recipeBases) }),
    protein: State.SQLite.text({ schema: Schema.Literal(...recipeProteins) }),
    effort: State.SQLite.text({ schema: Schema.Literal(...recipeEfforts) }),
    // Fun food a family saves for some days, like tacos or pizza.
    isTreat: State.SQLite.boolean(),
    // The questions it answered, and a hash of what it was read from; a profile is read again
    // when either changes.
    version: State.SQLite.integer(),
    sourceHash: State.SQLite.text(),
    profiledAt: State.SQLite.datetime(),
  },
});
export type RecipeProfile = typeof recipeProfiles.Type;
// What meal suggestions use from a profile.
export type RecipeProfileAnswers = Pick<
  RecipeProfile,
  "isDinner" | "base" | "protein" | "effort" | "isTreat"
>;

// Bump when the profile questions change (src/server/recipe-profile/clef.ts), so every recipe is
// read again with the new ones.
// v2: clearer dinner and treat questions, with their own thresholds.
export const recipeProfileVersion = 2;

// Replaces a recipe's profile.
export const recipeProfiled = Events.synced({
  name: "v1.RecipeProfiled",
  schema: Schema.Struct({
    recipeId: Schema.String,
    isDinner: Schema.Boolean,
    base: Schema.Literal(...recipeBases),
    protein: Schema.Literal(...recipeProteins),
    effort: Schema.Literal(...recipeEfforts),
    isTreat: Schema.Boolean,
    version: Schema.Int,
    sourceHash: Schema.String,
    profiledAt: Schema.Date,
  }),
});

// What a recipe's profile is read from. Tags stay out: they're the household's own words.
export function recipeProfileSource(recipe: {
  title: string;
  description?: string | null | undefined;
  ingredients: readonly RecipeSection[];
  instructions: readonly RecipeSection[];
}) {
  return {
    title: recipe.title,
    description: recipe.description ?? "",
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  };
}

function sectionValues(sections: readonly RecipeSection[]) {
  return sections.map(({ heading, items }) => [heading ?? "", items]);
}

// A short fingerprint of a profile's source (FNV-1a), to notice when the recipe changed. Built
// from values only, so the order of an object's keys doesn't matter.
export function recipeProfileSourceHash(source: ReturnType<typeof recipeProfileSource>) {
  const text = JSON.stringify([
    source.title,
    source.description,
    sectionValues(source.ingredients),
    sectionValues(source.instructions),
  ]);
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export const recipeProfileEvents = { recipeProfiled };
export const recipeProfileTables = { recipeProfiles };

export const recipeProfileMaterializers = State.SQLite.materializers(recipeProfileEvents, {
  "v1.RecipeProfiled": ({ recipeId, profiledAt, ...profile }) =>
    recipeProfiles.insert({ recipeId, ...profile, profiledAt }).onConflict("recipeId", "replace"),
});

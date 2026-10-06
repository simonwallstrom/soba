import { Events, Schema, State } from "@livestore/livestore";

import type { RecipeSection } from "./recipes";

// Days are local calendar dates, "2026-10-12", so a plan means the same day on every device.
const dateSchema = Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}$/u));

// One dinner a day. The last plan for a day wins.
export const plannedMeals = State.SQLite.table({
  name: "planned_meals",
  columns: {
    date: State.SQLite.text({ primaryKey: true }),
    recipeId: State.SQLite.text(),
    // Set on suggested meals: the suggestion that planned it, for undoing it as a whole, and the
    // recipes shuffling steps through.
    suggestionId: State.SQLite.text({ nullable: true }),
    alternatives: State.SQLite.json({ schema: Schema.Array(Schema.String), default: [] }),
    plannedBy: State.SQLite.text(),
    plannedAt: State.SQLite.datetime(),
  },
});
export type PlannedMealRow = typeof plannedMeals.Type;

export const declineKinds = ["shuffled", "removed"] as const;
export type DeclineKind = (typeof declineKinds)[number];

// Suggestions the household turned down, which later suggestions learn from. Planning the same
// recipe on that day again takes the decline back.
export const declinedSuggestions = State.SQLite.table({
  name: "declined_suggestions",
  columns: {
    date: State.SQLite.text(),
    recipeId: State.SQLite.text(),
    kind: State.SQLite.text({ schema: Schema.Literal(...declineKinds) }),
    declinedAt: State.SQLite.datetime(),
  },
  indexes: [{ name: "declined_suggestions_date", columns: ["date", "recipeId"] }],
});
export type DeclinedSuggestion = typeof declinedSuggestions.Type;

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
    profiledAt: State.SQLite.datetime(),
  },
});
export type RecipeProfile = typeof recipeProfiles.Type;

export const mealPlanned = Events.synced({
  name: "v1.MealPlanned",
  schema: Schema.Struct({
    date: dateSchema,
    recipeId: Schema.String,
    suggestion: Schema.optional(
      Schema.Struct({ id: Schema.String, alternatives: Schema.Array(Schema.String) }),
    ),
    plannedBy: Schema.String,
    plannedAt: Schema.Date,
  }),
});

export const mealUnplanned = Events.synced({
  name: "v1.MealUnplanned",
  schema: Schema.Struct({ date: dateSchema, unplannedBy: Schema.String, unplannedAt: Schema.Date }),
});

export const mealSuggestionDeclined = Events.synced({
  name: "v1.MealSuggestionDeclined",
  schema: Schema.Struct({
    date: dateSchema,
    recipeId: Schema.String,
    kind: Schema.Literal(...declineKinds),
    declinedBy: Schema.String,
    declinedAt: Schema.Date,
  }),
});

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

export const mealPlanEvents = {
  mealPlanned,
  mealUnplanned,
  mealSuggestionDeclined,
  recipeProfiled,
};
export const mealPlanTables = { plannedMeals, declinedSuggestions, recipeProfiles };

export const mealPlanMaterializers = State.SQLite.materializers(mealPlanEvents, {
  "v1.MealPlanned": ({ date, recipeId, suggestion, plannedBy, plannedAt }) => [
    plannedMeals
      .insert({
        date,
        recipeId,
        suggestionId: suggestion?.id ?? null,
        alternatives: suggestion?.alternatives ?? [],
        plannedBy,
        plannedAt,
      })
      .onConflict("date", "replace"),
    declinedSuggestions.delete().where({ date, recipeId }),
  ],
  "v1.MealUnplanned": ({ date }) => plannedMeals.delete().where({ date }),
  "v1.MealSuggestionDeclined": ({ date, recipeId, kind, declinedAt }) =>
    declinedSuggestions.insert({ date, recipeId, kind, declinedAt }),
  "v1.RecipeProfiled": ({ recipeId, profiledAt, ...profile }) =>
    recipeProfiles.insert({ recipeId, ...profile, profiledAt }).onConflict("recipeId", "replace"),
});

import { Events, makeSchema, Schema, State } from "@livestore/livestore";

// Ingredients and instructions: plain-text lines, optionally grouped under headings.
const recipeSectionSchema = Schema.Struct({
  heading: Schema.optional(Schema.String),
  items: Schema.Array(Schema.String),
});
export type RecipeSection = typeof recipeSectionSchema.Type;

// camelCase: React Refresh registers PascalCase bindings, which breaks this module in the LiveStore worker.
const recipeSectionsSchema = Schema.Array(recipeSectionSchema);

export const recipes = State.SQLite.table({
  name: "recipes",
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    title: State.SQLite.text(),
    description: State.SQLite.text({ nullable: true }),
    servings: State.SQLite.integer({ nullable: true }),
    imageUrl: State.SQLite.text({ nullable: true }),
    ingredients: State.SQLite.json({ schema: recipeSectionsSchema, default: [] }),
    instructions: State.SQLite.json({ schema: recipeSectionsSchema, default: [] }),
    // User IDs; names and photos come from the household's members.
    createdBy: State.SQLite.text(),
    updatedBy: State.SQLite.text(),
    createdAt: State.SQLite.datetime(),
    updatedAt: State.SQLite.datetime(),
    deletedAt: State.SQLite.datetime({ nullable: true }),
  },
});
export type Recipe = typeof recipes.Type;

// Tags belong to the household, so renaming one updates every recipe that uses it.
export const tags = State.SQLite.table({
  name: "tags",
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    name: State.SQLite.text(),
    createdAt: State.SQLite.datetime(),
    deletedAt: State.SQLite.datetime({ nullable: true }),
  },
});
export type Tag = typeof tags.Type;

export const recipeTags = State.SQLite.table({
  name: "recipe_tags",
  columns: {
    recipeId: State.SQLite.text(),
    tagId: State.SQLite.text(),
  },
  indexes: [{ name: "recipe_tags_recipe_tag", columns: ["recipeId", "tagId"], isUnique: true }],
});

// Each member's own favorites. The whole household syncs them, but only their owner sees them.
export const favorites = State.SQLite.table({
  name: "favorites",
  columns: {
    userId: State.SQLite.text(),
    recipeId: State.SQLite.text(),
    favoritedAt: State.SQLite.datetime(),
  },
  indexes: [{ name: "favorites_user_recipe", columns: ["userId", "recipeId"], isUnique: true }],
});
export type Favorite = typeof favorites.Type;

export const recipeViews = ["list", "grid"] as const;
export type RecipeView = (typeof recipeViews)[number];

export const recipeDetails = ["author", "tags"] as const;
export type RecipeDetail = (typeof recipeDetails)[number];

export const recipeSorts = ["name", "created", "updated"] as const;
export type RecipeSort = (typeof recipeSorts)[number];

// How this device shows the recipe list. Shared by its tabs, never synced to other devices.
export const recipeListSettings = State.SQLite.clientDocument({
  name: "recipeListSettings",
  schema: Schema.Struct({
    view: Schema.Literal(...recipeViews),
    sort: Schema.Literal(...recipeSorts),
    visibleDetails: Schema.Array(Schema.Literal(...recipeDetails)),
    isMealPlannerOpen: Schema.Boolean,
  }),
  default: {
    id: "recipes",
    value: {
      view: "list",
      sort: "name",
      visibleDetails: [...recipeDetails],
      isMealPlannerOpen: true,
    },
  },
});

// Synced event names are permanent; add a new version instead of changing a published event.
export const recipeCreated = Events.synced({
  name: "v1.RecipeCreated",
  schema: Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.optional(Schema.String),
    servings: Schema.optional(Schema.Int),
    imageUrl: Schema.optional(Schema.String),
    ingredients: Schema.optional(recipeSectionsSchema),
    instructions: Schema.optional(recipeSectionsSchema),
    tagIds: Schema.optional(Schema.Array(Schema.String)),
    createdBy: Schema.String,
    createdAt: Schema.Date,
  }),
});

// Replaces what the recipe page edits, and the last save wins. Leaving out the description or
// servings clears them. Optional fields added later must mean "unchanged" when left out, so
// replaying older saves keeps them.
export const recipeUpdated = Events.synced({
  name: "v1.RecipeUpdated",
  schema: Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.optional(Schema.String),
    servings: Schema.optional(Schema.Int),
    ingredients: recipeSectionsSchema,
    instructions: recipeSectionsSchema,
    tagIds: Schema.Array(Schema.String),
    updatedBy: Schema.String,
    updatedAt: Schema.Date,
  }),
});

export const tagCreated = Events.synced({
  name: "v1.TagCreated",
  schema: Schema.Struct({ id: Schema.String, name: Schema.String, createdAt: Schema.Date }),
});

export const recipeFavorited = Events.synced({
  name: "v1.RecipeFavorited",
  schema: Schema.Struct({
    recipeId: Schema.String,
    userId: Schema.String,
    favoritedAt: Schema.Date,
  }),
});

export const recipeUnfavorited = Events.synced({
  name: "v1.RecipeUnfavorited",
  schema: Schema.Struct({
    recipeId: Schema.String,
    userId: Schema.String,
    unfavoritedAt: Schema.Date,
  }),
});

const events = {
  recipeCreated,
  recipeUpdated,
  tagCreated,
  recipeFavorited,
  recipeUnfavorited,
  recipeListSettingsSet: recipeListSettings.set,
};
const tables = { recipes, tags, recipeTags, favorites, recipeListSettings };
const materializers = State.SQLite.materializers(events, {
  "v1.RecipeCreated": (recipe) => [
    recipes.insert({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description ?? null,
      servings: recipe.servings ?? null,
      imageUrl: recipe.imageUrl ?? null,
      ingredients: recipe.ingredients ?? [],
      instructions: recipe.instructions ?? [],
      createdBy: recipe.createdBy,
      updatedBy: recipe.createdBy,
      createdAt: recipe.createdAt,
      updatedAt: recipe.createdAt,
    }),
    ...(recipe.tagIds ?? []).map((tagId) => recipeTags.insert({ recipeId: recipe.id, tagId })),
  ],
  "v1.RecipeUpdated": ({ id, description, servings, tagIds, ...recipe }) => [
    recipes
      .update({ ...recipe, description: description ?? null, servings: servings ?? null })
      .where({ id }),
    recipeTags.delete().where({ recipeId: id }),
    ...tagIds.map((tagId) => recipeTags.insert({ recipeId: id, tagId })),
  ],
  "v1.TagCreated": ({ id, name, createdAt }) => tags.insert({ id, name, createdAt }),
  // Two devices may favorite the same recipe; the first stays.
  "v1.RecipeFavorited": ({ recipeId, userId, favoritedAt }) =>
    favorites
      .insert({ userId, recipeId, favoritedAt })
      .onConflict(["userId", "recipeId"], "ignore"),
  "v1.RecipeUnfavorited": ({ recipeId, userId }) => favorites.delete().where({ userId, recipeId }),
});

export const recipeSchema = makeSchema({
  state: State.SQLite.makeState({ tables, materializers }),
  events,
});

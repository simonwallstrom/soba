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

// A hand-picked group of the household's recipes, like "Quick dinners". Any member can
// change any collection, and deleting one leaves its recipes alone.
export const collections = State.SQLite.table({
  name: "collections",
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    title: State.SQLite.text(),
    description: State.SQLite.text({ nullable: true }),
    createdBy: State.SQLite.text(),
    updatedBy: State.SQLite.text(),
    createdAt: State.SQLite.datetime(),
    // Adding or removing a recipe counts as an update.
    updatedAt: State.SQLite.datetime(),
    deletedAt: State.SQLite.datetime({ nullable: true }),
  },
});
export type Collection = typeof collections.Type;

export const collectionRecipes = State.SQLite.table({
  name: "collection_recipes",
  columns: {
    collectionId: State.SQLite.text(),
    recipeId: State.SQLite.text(),
    addedBy: State.SQLite.text(),
    addedAt: State.SQLite.datetime(),
  },
  indexes: [
    {
      name: "collection_recipes_collection_recipe",
      columns: ["collectionId", "recipeId"],
      isUnique: true,
    },
  ],
});
export type CollectionRecipe = typeof collectionRecipes.Type;

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

// How this device shows the collection list, like recipeListSettings.
export const collectionListSettings = State.SQLite.clientDocument({
  name: "collectionListSettings",
  schema: Schema.Struct({ view: Schema.Literal(...recipeViews) }),
  default: { id: "collections", value: { view: "grid" } },
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

export const tagCreated = Events.synced({
  name: "v1.TagCreated",
  schema: Schema.Struct({ id: Schema.String, name: Schema.String, createdAt: Schema.Date }),
});

export const collectionCreated = Events.synced({
  name: "v1.CollectionCreated",
  schema: Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.optional(Schema.String),
    createdBy: Schema.String,
    createdAt: Schema.Date,
  }),
});

// Changes only the fields it carries; a null description clears it.
export const collectionUpdated = Events.synced({
  name: "v1.CollectionUpdated",
  schema: Schema.Struct({
    id: Schema.String,
    title: Schema.optional(Schema.String),
    description: Schema.optional(Schema.NullOr(Schema.String)),
    updatedBy: Schema.String,
    updatedAt: Schema.Date,
  }),
});

export const collectionDeleted = Events.synced({
  name: "v1.CollectionDeleted",
  schema: Schema.Struct({ id: Schema.String, deletedBy: Schema.String, deletedAt: Schema.Date }),
});

export const recipeAddedToCollection = Events.synced({
  name: "v1.RecipeAddedToCollection",
  schema: Schema.Struct({
    collectionId: Schema.String,
    recipeId: Schema.String,
    addedBy: Schema.String,
    addedAt: Schema.Date,
  }),
});

export const recipeRemovedFromCollection = Events.synced({
  name: "v1.RecipeRemovedFromCollection",
  schema: Schema.Struct({
    collectionId: Schema.String,
    recipeId: Schema.String,
    removedBy: Schema.String,
    removedAt: Schema.Date,
  }),
});

const events = {
  recipeCreated,
  tagCreated,
  collectionCreated,
  collectionUpdated,
  collectionDeleted,
  recipeAddedToCollection,
  recipeRemovedFromCollection,
  recipeListSettingsSet: recipeListSettings.set,
  collectionListSettingsSet: collectionListSettings.set,
};
const tables = {
  recipes,
  tags,
  recipeTags,
  collections,
  collectionRecipes,
  recipeListSettings,
  collectionListSettings,
};
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
  "v1.TagCreated": ({ id, name, createdAt }) => tags.insert({ id, name, createdAt }),
  "v1.CollectionCreated": ({ id, title, description, createdBy, createdAt }) =>
    collections.insert({
      id,
      title,
      description: description ?? null,
      createdBy,
      updatedBy: createdBy,
      createdAt,
      updatedAt: createdAt,
    }),
  "v1.CollectionUpdated": ({ id, title, description, updatedBy, updatedAt }) =>
    collections
      .update({
        ...(title === undefined ? {} : { title }),
        ...(description === undefined ? {} : { description }),
        updatedBy,
        updatedAt,
      })
      .where({ id }),
  "v1.CollectionDeleted": ({ id, deletedBy, deletedAt }) =>
    collections.update({ deletedAt, updatedBy: deletedBy, updatedAt: deletedAt }).where({ id }),
  // Two devices may add the same recipe; the first add stays.
  "v1.RecipeAddedToCollection": ({ collectionId, recipeId, addedBy, addedAt }) => [
    collectionRecipes
      .insert({ collectionId, recipeId, addedBy, addedAt })
      .onConflict(["collectionId", "recipeId"], "ignore"),
    collections.update({ updatedBy: addedBy, updatedAt: addedAt }).where({ id: collectionId }),
  ],
  "v1.RecipeRemovedFromCollection": ({ collectionId, recipeId, removedBy, removedAt }) => [
    collectionRecipes.delete().where({ collectionId, recipeId }),
    collections.update({ updatedBy: removedBy, updatedAt: removedAt }).where({ id: collectionId }),
  ],
});

export const recipeSchema = makeSchema({
  state: State.SQLite.makeState({ tables, materializers }),
  events,
});

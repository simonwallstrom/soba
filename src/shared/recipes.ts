import { Events, makeSchema, Schema, State } from "@livestore/livestore";

export const recipes = State.SQLite.table({
  name: "recipes",
  columns: {
    id: State.SQLite.text({ primaryKey: true }),
    title: State.SQLite.text({ nullable: false }),
    description: State.SQLite.text({ nullable: false }),
    createdAt: State.SQLite.datetime({ nullable: false }),
  },
});

// Synced event names are permanent; add a new version instead of changing a published event.
export const recipeCreated = Events.synced({
  name: "v1.RecipeCreated",
  schema: Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.String,
    createdAt: Schema.Date,
  }),
});

const events = { recipeCreated };
const tables = { recipes };
const materializers = State.SQLite.materializers(events, {
  "v1.RecipeCreated": ({ id, title, description, createdAt }) =>
    recipes.insert({ id, title, description, createdAt }),
});

export const recipeSchema = makeSchema({
  state: State.SQLite.makeState({ tables, materializers }),
  events,
});

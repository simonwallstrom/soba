import { Events, Schema, State } from "@livestore/livestore";

// Days are local calendar dates, "2026-10-12", so a plan means the same day on every device.
const dateSchema = Schema.String.pipe(Schema.pattern(/^\d{4}-\d{2}-\d{2}$/u));

// One dinner a day. The last plan for a day wins.
export const plannedMeals = State.SQLite.table({
  name: "planned_meals",
  columns: {
    date: State.SQLite.text({ primaryKey: true }),
    recipeId: State.SQLite.text(),
    // Set on suggested meals: the suggestion that planned it, for undoing it as a whole.
    suggestionId: State.SQLite.text({ nullable: true }),
    plannedBy: State.SQLite.text(),
    plannedAt: State.SQLite.datetime(),
  },
});
export type PlannedMealRow = typeof plannedMeals.Type;

export const mealPlanned = Events.synced({
  name: "v1.MealPlanned",
  schema: Schema.Struct({
    date: dateSchema,
    recipeId: Schema.String,
    // The suggestion that planned it, for undoing it as a whole.
    suggestion: Schema.optional(Schema.Struct({ id: Schema.String })),
    plannedBy: Schema.String,
    plannedAt: Schema.Date,
  }),
});

export const mealUnplanned = Events.synced({
  name: "v1.MealUnplanned",
  schema: Schema.Struct({ date: dateSchema, unplannedBy: Schema.String, unplannedAt: Schema.Date }),
});

// Moves a day's meal to another day. A meal already there swaps to the first day, so nothing is
// lost, and both keep who planned them and the suggestion they came from.
export const mealMoved = Events.synced({
  name: "v1.MealMoved",
  schema: Schema.Struct({
    from: dateSchema,
    to: dateSchema,
    movedBy: Schema.String,
    movedAt: Schema.Date,
  }),
});

export const mealPlanEvents = {
  mealPlanned,
  mealUnplanned,
  mealMoved,
};
export const mealPlanTables = { plannedMeals };

export const mealPlanMaterializers = State.SQLite.materializers(mealPlanEvents, {
  "v1.MealPlanned": ({ date, recipeId, suggestion, plannedBy, plannedAt }) => [
    plannedMeals
      .insert({
        date,
        recipeId,
        suggestionId: suggestion?.id ?? null,
        plannedBy,
        plannedAt,
      })
      .onConflict("date", "replace"),
  ],
  "v1.MealUnplanned": ({ date }) => plannedMeals.delete().where({ date }),
  "v1.MealMoved": ({ from, to }, { query }) => {
    const moving = query(plannedMeals.select().where({ date: from }).first());
    if (!moving || from === to) return [];
    const swapping = query(plannedMeals.select().where({ date: to }).first());
    return [
      plannedMeals.delete().where({ date: from }),
      ...(swapping ? [plannedMeals.insert({ ...swapping, date: from })] : []),
      plannedMeals.insert({ ...moving, date: to }).onConflict("date", "replace"),
    ];
  },
});

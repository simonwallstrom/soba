import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDatabase } from "../db/client";
import { plannedMeals, recipes } from "../db/schema";

const mealColumns = {
  date: plannedMeals.date,
  recipeId: plannedMeals.recipeId,
  plannedBy: plannedMeals.plannedBy,
  plannedAt: plannedMeals.plannedAt,
};

// Meals of a recipe in Recently deleted are kept, to come back with it, but hidden.
export async function listMeals(householdId: string) {
  return getDatabase()
    .select(mealColumns)
    .from(plannedMeals)
    .innerJoin(recipes, eq(plannedMeals.recipeId, recipes.id))
    .where(and(eq(plannedMeals.householdId, householdId), isNull(recipes.deletedAt)));
}

/** Plans a dinner for each day, replacing any already there. False if a recipe isn't the household's. */
export async function planMeals(
  householdId: string,
  userId: string,
  meals: { date: string; recipeId: string }[],
) {
  const db = getDatabase();
  const recipeIds = [...new Set(meals.map((meal) => meal.recipeId))];
  const known = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(
      and(
        eq(recipes.householdId, householdId),
        inArray(recipes.id, recipeIds),
        isNull(recipes.deletedAt),
      ),
    );
  if (known.length !== recipeIds.length) return false;

  const plannedAt = new Date();
  await db
    .insert(plannedMeals)
    .values(meals.map((meal) => ({ ...meal, householdId, plannedBy: userId, plannedAt })))
    .onConflictDoUpdate({
      target: [plannedMeals.householdId, plannedMeals.date],
      set: {
        recipeId: sql`excluded.recipe_id`,
        plannedBy: sql`excluded.planned_by`,
        plannedAt: sql`excluded.planned_at`,
      },
    });
  return true;
}

export async function unplanMeals(householdId: string, dates: string[]) {
  await getDatabase()
    .delete(plannedMeals)
    .where(and(eq(plannedMeals.householdId, householdId), inArray(plannedMeals.date, dates)));
}

// Moves a day's meal to another day, swapping with a meal already there; see moveMeal in
// @shared/meal-plan. Moving from an open day changes nothing. A hidden meal, of a deleted recipe,
// counts as open, and the move replaces it.
export async function moveMeal(householdId: string, from: string, to: string) {
  const db = getDatabase();
  const onDays = and(
    eq(plannedMeals.householdId, householdId),
    inArray(plannedMeals.date, [from, to]),
  );
  const rows = await db
    .select(mealColumns)
    .from(plannedMeals)
    .innerJoin(recipes, eq(plannedMeals.recipeId, recipes.id))
    .where(and(onDays, isNull(recipes.deletedAt)));
  const moving = rows.find((meal) => meal.date === from);
  if (!moving || from === to) return;
  const swapping = rows.find((meal) => meal.date === to);
  await db.batch([
    db.delete(plannedMeals).where(onDays),
    db
      .insert(plannedMeals)
      .values([
        { ...moving, householdId, date: to },
        ...(swapping ? [{ ...swapping, householdId, date: from }] : []),
      ]),
  ]);
}

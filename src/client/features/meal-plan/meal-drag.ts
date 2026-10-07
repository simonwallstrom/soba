const mealDragKey = Symbol("meal");

// A planned meal on its way to another day.
export type MealDragData = { [mealDragKey]: true; date: string };

export function mealDragData(date: string): MealDragData {
  return { [mealDragKey]: true, date };
}

export function isMealDragData(data: Record<string | symbol, unknown>): data is MealDragData {
  return data[mealDragKey] === true;
}

import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { isMealDragData } from "./meal-drag";

// The day under the pointer shows what dropping does; the rest stay as they are.
export type DayDrag = { isOver: boolean; kind: "recipe" | "meal" };

type DragData = Record<string | symbol, unknown>;
type DragSource = { source: { data: DragData } };

// Makes a day a drop target while `canDrop`: pass `ref` to the element covering the day. Meals
// from other days move onto it, swapping with its meal; given `recipeIdOf`, which reads a dragged
// recipe's id, recipes plan onto it too.
export function useDayDrop({
  canDrop,
  date,
  onDropRecipe,
  onMoveMeal,
  recipeIdOf,
}: {
  canDrop: boolean;
  date: string;
  onDropRecipe?: (recipeId: string) => void;
  onMoveMeal: (from: string) => void;
  recipeIdOf?: (data: DragData) => string | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DayDrag>({ isOver: false, kind: "recipe" });
  const moveDroppedMeal = useEffectEvent(onMoveMeal);
  const dropRecipe = useEffectEvent((recipeId: string) => onDropRecipe?.(recipeId));
  const readRecipeId = useEffectEvent((data: DragData) => recipeIdOf?.(data));
  useEffect(() => {
    const element = ref.current;
    if (!element || !canDrop) return undefined;
    return dropTargetForElements({
      element,
      // A meal's own day isn't somewhere to move it.
      canDrop: ({ source }: DragSource) =>
        isMealDragData(source.data)
          ? source.data.date !== date
          : readRecipeId(source.data) !== undefined,
      onDragEnter: ({ source }) =>
        setDrag({ isOver: true, kind: isMealDragData(source.data) ? "meal" : "recipe" }),
      onDragLeave: () => setDrag((current) => ({ ...current, isOver: false })),
      onDrop: ({ source }) => {
        setDrag((current) => ({ ...current, isOver: false }));
        if (isMealDragData(source.data)) {
          moveDroppedMeal(source.data.date);
          return;
        }
        const recipeId = readRecipeId(source.data);
        if (recipeId) dropRecipe(recipeId);
      },
    });
  }, [canDrop, date]);
  return { ref, drag };
}

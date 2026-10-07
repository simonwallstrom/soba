import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { ServingFoodIcon } from "@client/components/ui/icons";
import { ImagePlaceholder, ImageThumbnail } from "@client/components/ui/image-thumbnail";
import type { Recipe } from "@shared/recipes";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

// Recipes drag where there's room to drop them, beside the list on wide screens. Elsewhere, the
// recipe's actions plan it.
const dragMedia = "(min-width: 64rem)";

const recipeDragKey = Symbol("recipe");

export type RecipeDragData = { [recipeDragKey]: true; recipeId: string };

export function isRecipeDragData(data: Record<string | symbol, unknown>): data is RecipeDragData {
  return data[recipeDragKey] === true;
}

function recipeDragData(recipeId: string): RecipeDragData {
  return { [recipeDragKey]: true, recipeId };
}

// Makes an item showing a recipe draggable while `enabled`: pass `ref` to the item, and dim it
// while `isDragging`. It carries `data`, the recipe itself unless the item is something else,
// like a planned meal.
export function useRecipeDrag(
  recipe: Recipe,
  { data, enabled }: { data?: Record<string | symbol, unknown>; enabled: boolean },
) {
  const [isDragging, setIsDragging] = useState(false);
  // Read when a drag starts, so new data doesn't register the item again.
  const dataRef = useRef(data);
  useLayoutEffect(() => {
    dataRef.current = data;
  });
  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !enabled) return undefined;
      return draggable({
        element,
        canDrag: () => window.matchMedia(dragMedia).matches,
        getInitialData: () => dataRef.current ?? recipeDragData(recipe.id),
        onGenerateDragPreview: ({ nativeSetDragImage }) =>
          setCustomNativeDragPreview({
            nativeSetDragImage,
            // The preview's own padding keeps it clear of the pointer.
            getOffset: pointerOutsideOfPreview({ x: "0px", y: "0px" }),
            render: ({ container }) => {
              const root = createRoot(container);
              // The browser captures the preview as soon as this returns.
              flushSync(() => root.render(<RecipeDragPreview recipe={recipe} />));
              return () => root.unmount();
            },
          }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      });
    },
    [enabled, recipe],
  );
  return { ref: enabled ? ref : undefined, isDragging };
}

// The browser captures the preview's box, so transparent padding leaves room for the shadow.
function RecipeDragPreview({ recipe }: { recipe: Recipe }) {
  return (
    <div className="p-4">
      <div className="flex max-w-72 items-center gap-2.5 rounded-xl bg-white p-1.5 pr-4 font-medium text-olive-950 shadow-lg ring-[0.5px] ring-black/15 dark:bg-olive-900 dark:text-olive-50 dark:ring-white/15">
        {recipe.imageUrl ? (
          <ImageThumbnail
            className="h-9 w-10 shrink-0 rounded-md"
            height={72}
            loading="eager"
            src={recipe.imageUrl}
            width={80}
          />
        ) : (
          <ImagePlaceholder className="h-9 w-10 shrink-0 rounded-md [&_svg]:size-4">
            <ServingFoodIcon />
          </ImagePlaceholder>
        )}
        <span className="truncate">{recipe.title}</span>
      </div>
    </div>
  );
}

import { MediaListItem } from "@client/components/particles/media-item";
import { Button } from "@client/components/ui/button";
import { Add01Icon, Cancel01Icon, ServingFoodIcon, ShuffleIcon } from "@client/components/ui/icons";
import { ImagePlaceholder } from "@client/components/ui/image-thumbnail";
import { useDayDrop } from "@client/features/meal-plan/day-drop";
import type { DayDrag } from "@client/features/meal-plan/day-drop";
import { mealDragData } from "@client/features/meal-plan/meal-drag";
import { dayKey } from "@client/features/meal-plan/weeks";
import { useRecipeDrag } from "@client/features/recipes/recipe-drag";
import type { RecipeListEntry } from "@client/features/recipes/recipe-list";
import type { PlannedMealRow } from "@shared/meal-plan";
import { cn } from "cn";

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

// A day's date beside its meal; on phones the date sits above it. Today gets a bar at the row's
// edge, level with the date. Days before today are history: their meals open but can't change.
// On wide screens, meals from today on drag to other days, moving there or swapping.
export function PlannedDay({
  date,
  entry,
  isPast,
  isToday,
  meal,
  onChoose,
  onMoveMeal,
  onRemove,
  onShuffle,
  wasDroppedOn,
}: {
  date: Date;
  // The planned recipe, once recipes load.
  entry: RecipeListEntry | undefined;
  isPast: boolean;
  isToday: boolean;
  meal: PlannedMealRow | undefined;
  // Opens the recipe picker for the day.
  onChoose: () => void;
  // Moves the meal dragged from `from` to this day.
  onMoveMeal: (from: string) => void;
  onRemove: () => void;
  onShuffle: () => void;
  // Whether a drop just changed this day, which flashes to show where a meal landed.
  wasDroppedOn: boolean;
}) {
  const { ref, drag } = useDayDrop({ canDrop: !isPast, date: dayKey(date), onMoveMeal });
  return (
    <div className="col-span-full grid grid-cols-subgrid items-center" ref={ref}>
      <h3
        className={cn(
          "px-3 pt-3 whitespace-nowrap sm:py-3 sm:pr-6",
          isToday
            ? "font-medium text-olive-950 dark:text-olive-50"
            : isPast
              ? "text-olive-500"
              : "text-olive-600 dark:text-olive-400",
        )}
      >
        {/* The bar hangs past the heading's padding to reach the row's edge. */}
        <time
          aria-current={isToday ? "date" : undefined}
          className={cn(
            "relative",
            isToday &&
              "before:absolute before:top-1/2 before:-left-3.75 before:h-6 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-olive-800 dark:before:bg-olive-200",
          )}
          dateTime={date.toISOString()}
        >
          {dayFormat.format(date)}
        </time>
      </h3>
      {entry && meal ? (
        <MealItem
          canShuffle={meal.alternatives.length > 1}
          drag={drag}
          entry={entry}
          isHighlighted={wasDroppedOn}
          isPast={isPast}
          // The key replays the highlight when another meal lands on the same day.
          key={meal.recipeId}
          meal={meal}
          onRemove={onRemove}
          onShuffle={onShuffle}
        />
      ) : isPast ? (
        <p className="p-3 text-olive-400 dark:text-olive-600">Nothing planned</p>
      ) : (
        <EmptyMeal drag={drag} onChoose={onChoose} />
      )}
    </div>
  );
}

function MealItem({
  canShuffle,
  drag,
  entry: { author, recipe, tags },
  isHighlighted,
  isPast,
  meal,
  onRemove,
  onShuffle,
}: {
  canShuffle: boolean;
  drag: DayDrag;
  entry: RecipeListEntry;
  isHighlighted: boolean;
  isPast: boolean;
  meal: PlannedMealRow;
  onRemove: () => void;
  onShuffle: () => void;
}) {
  const details = [author?.name, tags.map((tag) => tag.name).join(" ")].filter(Boolean);
  const { ref, isDragging } = useRecipeDrag(recipe, {
    data: mealDragData(meal.date),
    enabled: !isPast,
  });
  return (
    // The drop overlay comes after the item, so it covers its actions; the week bands still sit
    // above it.
    <div className="relative">
      <MediaListItem
        actions={
          !isPast && (
            <>
              {/* Shuffling needs somewhere to go. */}
              {canShuffle && (
                <Button
                  aria-label="Suggest another recipe"
                  onClick={onShuffle}
                  size="icon-sm"
                  title="Shuffle"
                  variant="ghost"
                >
                  <ShuffleIcon />
                </Button>
              )}
              <Button
                aria-label={`Remove ${recipe.title} from the plan`}
                onClick={onRemove}
                size="icon-sm"
                title="Remove"
                variant="ghost"
              >
                <Cancel01Icon />
              </Button>
            </>
          )
        }
        className={isDragging ? "opacity-40" : undefined}
        details={details.join(" · ")}
        imageUrl={recipe.imageUrl}
        isDraggable={!isPast}
        isHighlighted={isHighlighted}
        link={{ to: "/recipes/$recipeId", params: { recipeId: recipe.id } }}
        placeholderIcon={<ServingFoodIcon />}
        ref={ref}
        title={recipe.title}
      />
      {drag.isOver && (
        <div className="absolute inset-1 z-10 flex items-center justify-center rounded-xl bg-olive-100/85 font-medium text-olive-800 ring-2 ring-olive-500 dark:bg-olive-900/85 dark:text-olive-100">
          Swap
        </div>
      )}
    </div>
  );
}

// An open day under a dragged meal says dropping moves it there.
function EmptyMeal({ drag: { isOver }, onChoose }: { drag: DayDrag; onChoose: () => void }) {
  if (isOver) {
    return (
      <div className="m-1 flex h-17 items-center justify-center rounded-xl border-[1.5px] border-olive-600 bg-olive-200/70 text-sm font-medium text-olive-900 dark:border-olive-300 dark:bg-olive-800 dark:text-olive-50">
        Move here
      </div>
    );
  }
  return (
    <button
      onClick={onChoose}
      className="group flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-1 active:bg-black/5 dark:hover:bg-white/6 dark:active:bg-white/4"
      type="button"
    >
      <ImagePlaceholder className="size-13 shrink-0 bg-transparent text-olive-500 ring-black/15 dark:bg-transparent dark:ring-white/15 [&_svg]:size-5">
        <Add01Icon />
      </ImagePlaceholder>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-medium text-olive-700 dark:text-olive-300">Add meal</span>
        <span className="truncate text-sm text-olive-500">Choose a recipe for this day</span>
      </span>
    </button>
  );
}

import { MediaListItem } from "@client/components/particles/media-item";
import { Button } from "@client/components/ui/button";
import { Add01Icon, Cancel01Icon, ServingFoodIcon, ShuffleIcon } from "@client/components/ui/icons";
import { ImagePlaceholder } from "@client/components/ui/image-thumbnail";
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
export function PlannedDay({
  date,
  entry,
  isPast,
  isToday,
  meal,
  onChoose,
  onRemove,
  onShuffle,
}: {
  date: Date;
  // The planned recipe, once recipes load.
  entry: RecipeListEntry | undefined;
  isPast: boolean;
  isToday: boolean;
  meal: PlannedMealRow | undefined;
  // Opens the recipe picker for the day.
  onChoose: () => void;
  onRemove: () => void;
  onShuffle: () => void;
}) {
  return (
    <div className="col-span-full grid grid-cols-subgrid items-center">
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
          entry={entry}
          isPast={isPast}
          onRemove={onRemove}
          onShuffle={onShuffle}
          canShuffle={meal.alternatives.length > 1}
        />
      ) : isPast ? (
        <p className="p-3 text-olive-400 dark:text-olive-600">Nothing planned</p>
      ) : (
        <EmptyMeal onChoose={onChoose} />
      )}
    </div>
  );
}

function MealItem({
  canShuffle,
  entry: { author, recipe, tags },
  isPast,
  onRemove,
  onShuffle,
}: {
  canShuffle: boolean;
  entry: RecipeListEntry;
  isPast: boolean;
  onRemove: () => void;
  onShuffle: () => void;
}) {
  const details = [author?.name, tags.map((tag) => tag.name).join(" ")].filter(Boolean);
  return (
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
      details={details.join(" · ")}
      imageUrl={recipe.imageUrl}
      link={{ to: "/recipes/$recipeId", params: { recipeId: recipe.id } }}
      placeholderIcon={<ServingFoodIcon />}
      title={recipe.title}
    />
  );
}

function EmptyMeal({ onChoose }: { onChoose: () => void }) {
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

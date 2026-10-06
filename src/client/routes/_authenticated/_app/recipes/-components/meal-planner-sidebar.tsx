import { AppAside } from "@client/components/particles/app-aside";
import { Button } from "@client/components/ui/button";
import {
  Cancel01Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ServingFoodIcon,
} from "@client/components/ui/icons";
import { ImagePlaceholder, ImageThumbnail } from "@client/components/ui/image-thumbnail";
import { ScrollArea } from "@client/components/ui/scroll-area";
import { getWeek } from "@client/features/meal-plan/weeks";
import type { RecipeListEntry } from "@client/features/recipes/recipe-list";
import { Link } from "@tanstack/react-router";

// A prototype week: the first five days get recipes picked from the household's list.
const plannedPicks = [1, 18, 12, 4, 8];

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function MealPlannerSidebar({
  entries,
  onClose,
}: {
  entries: readonly RecipeListEntry[];
  onClose: () => void;
}) {
  const week = getWeek(new Date());

  return (
    <AppAside>
      <aside
        className="hidden w-96 shrink-0 flex-col border-l-[0.5px] border-black/18 lg:flex dark:border-white/10"
        id="meal-planner-sidebar"
      >
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b-[0.5px] border-black/18 pr-4 pl-6 font-medium dark:border-white/10">
          <h2>Meal planner</h2>
          <div className="flex items-center gap-1">
            <span className="font-normal text-olive-600 dark:text-olive-400">
              Week {week.number}
            </span>
            <div>
              <Button aria-label="Previous week" size="icon" variant="ghost">
                <ChevronLeftIcon className="-translate-x-px" />
              </Button>
              <Button aria-label="Next week" size="icon" variant="ghost">
                <ChevronRightIcon className="translate-x-px" />
              </Button>
            </div>
            <div className="mx-2 h-3.5 w-px bg-black/12 dark:bg-white/8" />
            <Button aria-label="Close meal planner" onClick={onClose} size="icon" variant="ghost">
              <Cancel01Icon />
            </Button>
          </div>
        </header>
        <ScrollArea className="flex-1" scrollFade>
          <div className="flex flex-col gap-4 p-6">
            {week.days.map((day, index) => {
              const pick = plannedPicks[index];
              const entry = pick === undefined ? undefined : entries[pick % entries.length];
              return (
                <div className="flex flex-col gap-2" key={day.toISOString()}>
                  <div className="font-medium text-olive-600 dark:text-olive-400">
                    {dayFormat.format(day)}
                  </div>
                  {entry ? <PlannedMeal entry={entry} /> : <EmptyMealSlot />}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </aside>
    </AppAside>
  );
}

function PlannedMeal({ entry: { recipe, tags } }: { entry: RecipeListEntry }) {
  return (
    <div className="group relative -mx-2 flex items-center gap-2 rounded-xl bg-olive-100 p-2 hover:bg-olive-200/70 dark:bg-olive-900/50 dark:hover:bg-olive-900">
      <Link
        aria-label={`Open ${recipe.title}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-1"
        params={{ recipeId: recipe.id }}
        to="/recipes/$recipeId"
      />
      {recipe.imageUrl ? (
        <ImageThumbnail
          className="h-11 w-12 shrink-0"
          height={88}
          src={recipe.imageUrl}
          width={96}
        />
      ) : (
        <ImagePlaceholder className="h-11 w-12 shrink-0 [&_svg]:size-5">
          <ServingFoodIcon />
        </ImagePlaceholder>
      )}
      <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="truncate font-medium">{recipe.title}</div>
        <div className="pointer-events-auto relative z-10 flex min-w-0 items-center gap-1.5 overflow-hidden">
          {tags.map((tag) => (
            <Link
              className="shrink-0 rounded-sm text-sm text-olive-500 hover:text-olive-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 dark:hover:text-olive-200"
              key={tag.id}
              search={{ tags: [tag.id] }}
              to="/recipes"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      </div>
      <Button
        aria-label={`Remove ${recipe.title} from meal plan`}
        className="relative z-10 mr-1 ml-auto"
        size="icon"
        variant="ghost"
      >
        <Cancel01Icon />
      </Button>
    </div>
  );
}

function EmptyMealSlot() {
  return (
    <div className="flex h-15 items-center justify-center rounded-xl border border-dashed p-2 dark:bg-olive-900/50">
      <span className="text-sm text-olive-500 italic">Drop a recipe here…</span>
    </div>
  );
}

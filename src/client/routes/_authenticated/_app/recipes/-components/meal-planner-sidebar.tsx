import { AppAside } from "@client/components/particles/app-aside";
import { Button } from "@client/components/ui/button";
import {
  Add01Icon,
  Cancel01Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ServingFoodIcon,
} from "@client/components/ui/icons";
import { ImagePlaceholder, ImageThumbnail } from "@client/components/ui/image-thumbnail";
import { ScrollArea } from "@client/components/ui/scroll-area";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { planMeal, removeMeal } from "@client/features/meal-plan/meal-events";
import { MealPicker } from "@client/features/meal-plan/meal-picker";
import { plannedMeals$ } from "@client/features/meal-plan/queries";
import { dayKey, getWeek, isPast } from "@client/features/meal-plan/weeks";
import type { RecipeListEntry } from "@client/features/recipes/recipe-list";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { useState } from "react";

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

// One week at a time, from this one. Days before today show what was eaten but can't change.
export function MealPlannerSidebar({
  entries,
  householdId,
  onClose,
  userId,
}: {
  entries: readonly RecipeListEntry[];
  householdId: string;
  onClose: () => void;
  userId: string;
}) {
  const store = useHouseholdStore(householdId);
  const rows = useHouseholdQuery(householdId, plannedMeals$);
  const [today] = useState(() => new Date());
  // Weeks from this one.
  const [weekOffset, setWeekOffset] = useState(0);
  // The picker keeps its day after closing, so it can show it while it animates out.
  const [picker, setPicker] = useState<{ date?: Date; open: boolean }>({ open: false });
  const entriesById = new Map(entries.map((entry) => [entry.recipe.id, entry]));
  // A meal whose recipe was deleted leaves its day open.
  const plan = new Map(
    rows.filter((row) => entriesById.has(row.recipeId)).map((row) => [row.date, row]),
  );
  const week = getWeek(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + weekOffset * 7),
  );

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
              <Button
                aria-label="Previous week"
                onClick={() => setWeekOffset((offset) => offset - 1)}
                size="icon"
                variant="ghost"
              >
                <ChevronLeftIcon className="-translate-x-px" />
              </Button>
              <Button
                aria-label="Next week"
                onClick={() => setWeekOffset((offset) => offset + 1)}
                size="icon"
                variant="ghost"
              >
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
            {week.days.map((day) => {
              const meal = plan.get(dayKey(day));
              const entry = meal && entriesById.get(meal.recipeId);
              const isDayPast = isPast(day, today);
              const isToday = day.toDateString() === today.toDateString();
              return (
                <div className="flex flex-col gap-2" key={day.toISOString()}>
                  <time
                    aria-current={isToday ? "date" : undefined}
                    className={cn(
                      "font-medium",
                      isToday
                        ? "text-olive-950 dark:text-olive-50"
                        : isDayPast
                          ? "text-olive-500"
                          : "text-olive-600 dark:text-olive-400",
                    )}
                    dateTime={dayKey(day)}
                  >
                    {isToday ? `Today, ${dayFormat.format(day)}` : dayFormat.format(day)}
                  </time>
                  {meal && entry ? (
                    <PlannedMeal
                      entry={entry}
                      onRemove={
                        isDayPast
                          ? undefined
                          : () => removeMeal(store, userId, meal, entry.recipe.title)
                      }
                    />
                  ) : isDayPast ? (
                    <p className="text-olive-400 dark:text-olive-600">Nothing planned</p>
                  ) : (
                    <EmptyMealSlot onChoose={() => setPicker({ date: day, open: true })} />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <MealPicker
          date={picker.date}
          entries={entries}
          onOpenChange={(open) => setPicker((current) => ({ ...current, open }))}
          onPick={(recipeId) => {
            if (picker.date) store.commit(planMeal(userId, dayKey(picker.date), recipeId));
          }}
          open={picker.open}
        />
      </aside>
    </AppAside>
  );
}

// Past meals can't be removed, so they go without `onRemove`.
function PlannedMeal({
  entry: { recipe, tags },
  onRemove,
}: {
  entry: RecipeListEntry;
  onRemove: (() => void) | undefined;
}) {
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
      {onRemove && (
        <Button
          aria-label={`Remove ${recipe.title} from the plan`}
          className="relative z-10 mr-1 ml-auto"
          onClick={onRemove}
          size="icon"
          title="Remove"
          variant="ghost"
        >
          <Cancel01Icon />
        </Button>
      )}
    </div>
  );
}

function EmptyMealSlot({ onChoose }: { onChoose: () => void }) {
  return (
    <button
      className="flex h-15 items-center justify-center gap-1.5 rounded-xl border border-dashed p-2 text-sm text-olive-500 hover:bg-black/5 hover:text-olive-700 focus-visible:outline-2 focus-visible:outline-offset-1 dark:bg-olive-900/50 dark:hover:bg-white/6 dark:hover:text-olive-300 [&_svg]:size-4"
      onClick={onChoose}
      type="button"
    >
      <Add01Icon />
      Add meal
    </button>
  );
}

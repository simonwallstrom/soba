import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
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
import { toast } from "@client/components/ui/toast";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { isMealDragData, mealDragData } from "@client/features/meal-plan/meal-drag";
import { moveMeal, planMeal, removeMeal } from "@client/features/meal-plan/meal-events";
import { MealPicker } from "@client/features/meal-plan/meal-picker";
import { plannedMeals$ } from "@client/features/meal-plan/queries";
import { dayKey, getWeek, isPast } from "@client/features/meal-plan/weeks";
import { isRecipeDragData, useRecipeDrag } from "@client/features/recipes/recipe-drag";
import type { RecipeListEntry } from "@client/features/recipes/recipe-list";
import type { PlannedMealRow } from "@shared/meal-plan";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { ReactNode } from "react";

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
  // The days a drop just changed, which flash to show where meals landed.
  const [droppedOn, setDroppedOn] = useState<readonly string[]>([]);

  function changeWeek(change: number) {
    setWeekOffset((offset) => offset + change);
    setDroppedOn([]);
  }

  // Dropping on a planned day replaces its meal, and the toast can put it back.
  function dropRecipe(date: string, recipeId: string) {
    const previous = plan.get(date);
    if (previous?.recipeId === recipeId) return;
    store.commit(planMeal(userId, date, recipeId));
    setDroppedOn([date]);
    if (!previous) return;
    const replaced = entriesById.get(previous.recipeId)?.recipe.title;
    toast.add({
      title: replaced ? `Replaced ${replaced}` : "Replaced the meal",
      actionProps: {
        children: "Undo",
        onClick: () => store.commit(planMeal(userId, date, previous.recipeId, previous)),
      },
    });
  }

  // Moving onto a planned day swaps the two meals, so both days change.
  function dropMeal(from: string, to: string) {
    store.commit(moveMeal(userId, from, to));
    setDroppedOn(plan.has(to) ? [from, to] : [to]);
  }

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
                onClick={() => changeWeek(-1)}
                size="icon"
                variant="ghost"
              >
                <ChevronLeftIcon className="-translate-x-px" />
              </Button>
              <Button
                aria-label="Next week"
                onClick={() => changeWeek(1)}
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
              return (
                <PlannerDay
                  date={day}
                  entry={entry}
                  isPastDay={isPast(day, today)}
                  isToday={day.toDateString() === today.toDateString()}
                  key={day.toISOString()}
                  meal={meal}
                  onChoose={() => setPicker({ date: day, open: true })}
                  onDropRecipe={(recipeId) => dropRecipe(dayKey(day), recipeId)}
                  onMoveMeal={(from) => dropMeal(from, dayKey(day))}
                  onRemove={(planned, title) => removeMeal(store, userId, planned, title)}
                  wasDroppedOn={droppedOn.includes(dayKey(day))}
                />
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

// While a recipe or meal is dragged, every day shows whether it takes it, and the one under the
// pointer shows what dropping does. A meal's own day stays as it is.
type DropState = "idle" | "available" | "over" | "unavailable";
type Drag = { state: DropState; kind: "recipe" | "meal" };

type DragSource = { source: { data: Record<string | symbol, unknown> } };

function isPlannable({ source }: DragSource) {
  return isRecipeDragData(source.data) || isMealDragData(source.data);
}

function useDayDrop({
  canDrop,
  date,
  onDropRecipe,
  onMoveMeal,
}: {
  canDrop: boolean;
  date: string;
  onDropRecipe: (recipeId: string) => void;
  onMoveMeal: (from: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag>({ state: "idle", kind: "recipe" });
  const dropRecipe = useEffectEvent(onDropRecipe);
  const moveDroppedMeal = useEffectEvent(onMoveMeal);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const isOwnMeal = ({ source }: DragSource) =>
      isMealDragData(source.data) && source.data.date === date;
    const monitor = monitorForElements({
      canMonitor: isPlannable,
      onDragStart: (args) => {
        const kind = isMealDragData(args.source.data) ? "meal" : "recipe";
        const state = !canDrop ? "unavailable" : isOwnMeal(args) ? "idle" : "available";
        setDrag({ state, kind });
      },
      onDrop: () => setDrag((current) => ({ ...current, state: "idle" })),
    });
    if (!canDrop) return monitor;
    return combine(
      monitor,
      dropTargetForElements({
        element,
        canDrop: (args) => isPlannable(args) && !isOwnMeal(args),
        onDragEnter: () => setDrag((current) => ({ ...current, state: "over" })),
        onDragLeave: () => setDrag((current) => ({ ...current, state: "available" })),
        onDrop: ({ source }) => {
          if (isRecipeDragData(source.data)) dropRecipe(source.data.recipeId);
          if (isMealDragData(source.data)) moveDroppedMeal(source.data.date);
        },
      }),
    );
  }, [canDrop, date]);
  return { ref, drag };
}

function PlannerDay({
  date,
  entry,
  isPastDay,
  isToday,
  meal,
  onChoose,
  onDropRecipe,
  onMoveMeal,
  onRemove,
  wasDroppedOn,
}: {
  date: Date;
  entry: RecipeListEntry | undefined;
  isPastDay: boolean;
  isToday: boolean;
  meal: PlannedMealRow | undefined;
  onChoose: () => void;
  onDropRecipe: (recipeId: string) => void;
  onMoveMeal: (from: string) => void;
  onRemove: (meal: PlannedMealRow, title: string) => void;
  wasDroppedOn: boolean;
}) {
  // Days before today are history.
  const { ref, drag } = useDayDrop({
    canDrop: !isPastDay,
    date: dayKey(date),
    onDropRecipe,
    onMoveMeal,
  });
  let content: ReactNode;
  if (meal && entry) {
    content = (
      <PlannedMeal
        drag={drag}
        entry={entry}
        isHighlighted={wasDroppedOn}
        // The key replays the highlight when another recipe lands on the same day.
        key={meal.recipeId}
        meal={meal}
        onRemove={isPastDay ? undefined : () => onRemove(meal, entry.recipe.title)}
      />
    );
  } else if (isPastDay) {
    content = <p className="text-olive-400 dark:text-olive-600">Nothing planned</p>;
  } else {
    content = <EmptyMealSlot drag={drag} onChoose={onChoose} />;
  }
  return (
    <div
      className={cn(
        "flex flex-col gap-2 transition-opacity",
        drag.state === "unavailable" && "opacity-40",
      )}
      ref={ref}
    >
      <time
        aria-current={isToday ? "date" : undefined}
        className={cn(
          "font-medium",
          isToday
            ? "text-olive-950 dark:text-olive-50"
            : isPastDay
              ? "text-olive-500"
              : "text-olive-600 dark:text-olive-400",
        )}
        dateTime={dayKey(date)}
      >
        {isToday ? `Today, ${dayFormat.format(date)}` : dayFormat.format(date)}
      </time>
      {content}
    </div>
  );
}

// Meals ahead drag to other days; past ones can't change, so they go without `onRemove`.
function PlannedMeal({
  drag,
  entry: { recipe, tags },
  isHighlighted,
  meal,
  onRemove,
}: {
  drag: Drag;
  entry: RecipeListEntry;
  isHighlighted: boolean;
  meal: PlannedMealRow;
  onRemove: (() => void) | undefined;
}) {
  const canDrag = onRemove !== undefined;
  const { ref, isDragging } = useRecipeDrag(recipe, {
    data: mealDragData(meal.date),
    enabled: canDrag,
  });
  return (
    <div
      className={cn(
        "group relative -mx-2 flex items-center gap-2 rounded-xl bg-olive-100 p-2 hover:bg-olive-200/70 dark:bg-olive-900/50 dark:hover:bg-olive-900",
        isHighlighted && "highlight-fade",
        isDragging && "opacity-40",
      )}
      ref={ref}
    >
      {drag.state === "available" && (
        <div className="pointer-events-none absolute inset-0 z-20 rounded-xl border-[1.5px] border-dashed border-olive-500 dark:border-olive-400" />
      )}
      {drag.state === "over" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-olive-100/85 font-medium text-olive-800 ring-2 ring-olive-500 dark:bg-olive-900/85 dark:text-olive-100">
          {drag.kind === "meal" ? "Swap" : "Replace"}
        </div>
      )}
      <Link
        aria-label={`Open ${recipe.title}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-1"
        draggable={canDrag ? false : undefined}
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
        <div className="truncate text-sm text-olive-500 empty:hidden">
          {tags.map((tag) => tag.name).join(" ")}
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

function EmptyMealSlot({ drag: { kind, state }, onChoose }: { drag: Drag; onChoose: () => void }) {
  return (
    <button
      className={cn(
        "-mx-2 flex h-15 items-center justify-center gap-1.5 rounded-xl border border-dashed p-2 text-sm text-olive-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 dark:bg-olive-900/50 [&_svg]:size-4",
        state === "idle" &&
          "hover:bg-black/5 hover:text-olive-700 dark:hover:bg-white/6 dark:hover:text-olive-300",
        state === "available" &&
          "border-[1.5px] border-olive-500 bg-olive-100/60 text-olive-700 dark:border-olive-400 dark:bg-olive-900 dark:text-olive-200",
        state === "over" &&
          "border-[1.5px] border-solid border-olive-600 bg-olive-200/70 text-olive-900 dark:border-olive-300 dark:bg-olive-800 dark:text-olive-50",
      )}
      onClick={onChoose}
      type="button"
    >
      {state === "idle" ? (
        <>
          <Add01Icon />
          Add meal
        </>
      ) : kind === "meal" ? (
        "Move here"
      ) : (
        "Drop to plan"
      )}
    </button>
  );
}

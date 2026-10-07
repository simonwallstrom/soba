import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { Button } from "@client/components/ui/button";
import { toast } from "@client/components/ui/toast";
import { useMembersById } from "@client/features/household/members";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { moveMeal, planMeal, removeMeal, unplanMeal } from "@client/features/meal-plan/meal-events";
import { MealPicker } from "@client/features/meal-plan/meal-picker";
import { plannedMeals$ } from "@client/features/meal-plan/queries";
import { dayKey, isPast } from "@client/features/meal-plan/weeks";
import { recipeProfiles$, recipes$, recipeTags$, tags$ } from "@client/features/recipes/queries";
import { guessProfile } from "@client/features/recipes/recipe-profile";
import { groupTagsByRecipe } from "@client/features/recipes/recipe-tags";
import { formatMetaTitle } from "@client/lib/meta";
import { mealPlanned } from "@shared/meal-plan";
import type { PlannedMealRow } from "@shared/meal-plan";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { PlannedDay } from "./-components/planned-day";
import { WeekHeader } from "./-components/week-header";
import { clearableDays, copyMeals, getPlannerWeeks } from "./-meal-plan";
import type { PlannerWeek } from "./-meal-plan";
import { nextShuffle, shuffleOptions, suggestWeek } from "./-suggest";

export const Route = createFileRoute("/_authenticated/_app/meal-planner/")({
  staticData: { breadcrumbs: [{ label: "Meal planner" }], placesOwnScroll: true },
  component: MealPlanner,
});

// The app layout's scrolling content, which the weeks scroll in.
function getScrollRoot(element: HTMLElement) {
  return element.closest<HTMLElement>('[data-scroll-restoration-id="app-content"]');
}

// Brings a week's band to the top of the content.
function scrollToWeek(list: HTMLElement, index: number, behavior: ScrollBehavior = "instant") {
  const root = getScrollRoot(list);
  const week = list.children[index];
  if (!root || !week) return;
  const top = root.scrollTop + week.getBoundingClientRect().top - root.getBoundingClientRect().top;
  root.scrollTo({ top, behavior });
}

// Reports whether any of a week is in view. Returns a function that stops watching.
function watchWeek(
  list: HTMLElement,
  index: number,
  onVisibleChange: (isVisible: boolean) => void,
) {
  const week = list.children[index];
  const observer = new IntersectionObserver(
    ([entry]) => onVisibleChange(entry?.isIntersecting ?? true),
    { root: getScrollRoot(list) },
  );
  if (week) observer.observe(week);
  return () => observer.disconnect();
}

function MealPlanner() {
  const { household, user } = Route.useRouteContext();
  const store = useHouseholdStore(household.id);
  const recipes = useHouseholdQuery(household.id, recipes$);
  const tags = useHouseholdQuery(household.id, tags$);
  const links = useHouseholdQuery(household.id, recipeTags$);
  const rows = useHouseholdQuery(household.id, plannedMeals$);
  const profileRows = useHouseholdQuery(household.id, recipeProfiles$);
  const membersById = useMembersById();
  const listRef = useRef<HTMLDivElement>(null);
  const [today] = useState(() => new Date());
  const tagsByRecipe = groupTagsByRecipe(tags, links);
  const entries = recipes.map((recipe) => ({
    recipe,
    tags: tagsByRecipe.get(recipe.id) ?? [],
    author: membersById?.get(recipe.createdBy),
  }));
  const entriesById = new Map(entries.map((entry) => [entry.recipe.id, entry]));
  // A meal whose recipe was deleted leaves its day open.
  const plan = new Map(
    rows.filter((row) => entriesById.has(row.recipeId)).map((row) => [row.date, row]),
  );
  // Recipes a model hasn't read yet are guessed from their title and tags.
  const storedProfiles = new Map(profileRows.map((row) => [row.recipeId, row]));
  const profiles = new Map(
    entries.map((entry) => [
      entry.recipe.id,
      storedProfiles.get(entry.recipe.id) ?? guessProfile(entry),
    ]),
  );
  // Past weeks can't change, so the weeks are worked out once.
  const [{ weeks, currentWeekIndex }] = useState(() => getPlannerWeeks(today, plan));
  const [isCurrentWeekVisible, setIsCurrentWeekVisible] = useState(true);

  // Opens on the current week; the router leaves this page's scroll alone.
  useLayoutEffect(() => {
    if (listRef.current) scrollToWeek(listRef.current, currentWeekIndex);
  }, [currentWeekIndex]);
  useEffect(
    () =>
      listRef.current
        ? watchWeek(listRef.current, currentWeekIndex, setIsCurrentWeekVisible)
        : undefined,
    [currentWeekIndex],
  );
  // Dragging a meal near the content's edges scrolls it, to reach other weeks.
  useEffect(() => {
    const root = listRef.current && getScrollRoot(listRef.current);
    return root ? autoScrollForElements({ element: root }) : undefined;
  }, []);
  // The days a drop just changed, which flash to show where meals landed.
  const [droppedOn, setDroppedOn] = useState<readonly string[]>([]);

  // Moving onto a planned day swaps the two meals, so both days change.
  function dropMeal(from: string, to: string) {
    store.commit(moveMeal(user.id, from, to));
    setDroppedOn(plan.has(to) ? [from, to] : [to]);
  }

  // The week's open days fill in at once; shuffle any day you don't like, or undo the lot.
  function suggest(week: PlannerWeek) {
    const id = crypto.randomUUID();
    const suggested = suggestWeek(week, { plan, profiles, today });
    if (suggested.length === 0) return;
    store.commit(
      ...suggested.map(({ date, recipeId }) =>
        mealPlanned({
          date,
          recipeId,
          suggestion: { id },
          plannedBy: user.id,
          plannedAt: new Date(),
        }),
      ),
    );
    toast.add({
      title: `Suggested ${suggested.length} ${suggested.length === 1 ? "meal" : "meals"} for week ${week.number}`,
      description: "Shuffle a day for something similar.",
      actionProps: {
        children: "Undo",
        // Takes back the days still holding this suggestion, leaving ones changed since.
        onClick: () => {
          const days = store
            .query(plannedMeals$)
            .filter((row) => row.suggestionId === id)
            .map((row) => unplanMeal(user.id, row.date));
          if (days.length > 0) store.commit(...days);
        },
      },
    });
  }

  // The picker keeps its day after closing, so it can show it while it animates out.
  const [picker, setPicker] = useState<{ date?: Date; open: boolean }>({ open: false });

  // Shuffling browses recipes like a suggested meal, round to where it started; it teaches the
  // planner nothing, since people shuffle for ideas and often keep the first pick.
  function shuffler(week: PlannerWeek, date: Date, meal: PlannedMealRow | undefined) {
    if (!meal?.suggestionId || isPast(date, today)) return undefined;
    const options = shuffleOptions(week, date, { plan, profiles, today });
    const recipeId = nextShuffle(options, meal.recipeId);
    return recipeId ? () => store.commit(planMeal(user.id, meal.date, recipeId, meal)) : undefined;
  }

  function copy(from: PlannerWeek, to: PlannerWeek) {
    const copies = copyMeals(from, to, plan, today);
    if (copies.length > 0) {
      store.commit(...copies.map(({ date, recipeId }) => planMeal(user.id, date, recipeId)));
    }
    toast.add({
      title:
        copies.length > 0
          ? `Copied ${copies.length} ${copies.length === 1 ? "meal" : "meals"} to week ${to.number}`
          : `Week ${to.number} has no open days`,
      actionProps: {
        children: "Show",
        onClick: () => {
          if (listRef.current) scrollToWeek(listRef.current, weeks.indexOf(to), "smooth");
        },
      },
    });
  }

  function mealOn(date: Date) {
    return plan.get(dayKey(date));
  }

  function clear(week: PlannerWeek) {
    const days = clearableDays(week, plan, today);
    if (days.length > 0) store.commit(...days.map((date) => unplanMeal(user.id, date)));
  }

  return (
    <>
      <title>{formatMetaTitle("Meal planner")}</title>
      <AppHeaderActions>
        {!isCurrentWeekVisible && (
          <Button
            className="-mr-2"
            onClick={() =>
              listRef.current && scrollToWeek(listRef.current, currentWeekIndex, "smooth")
            }
            shape="pill"
            variant="ghost"
          >
            Today
          </Button>
        )}
      </AppHeaderActions>
      <MealPicker
        date={picker.date}
        entries={entries}
        onOpenChange={(open) => setPicker((current) => ({ ...current, open }))}
        onPick={(recipeId) => {
          if (picker.date) store.commit(planMeal(user.id, dayKey(picker.date), recipeId));
        }}
        open={picker.open}
      />
      {/* Dates share one column across weeks, so meals line up all the way down. */}
      <div
        className="grid grid-cols-1 pb-8 sm:grid-cols-[max-content_minmax(0,1fr)] lg:pb-12"
        ref={listRef}
      >
        {weeks.map((week) => {
          const openDays = week.days.filter((date) => !isPast(date, today));
          return (
            <section className="col-span-full grid grid-cols-subgrid" key={week.offset}>
              <WeekHeader
                canClear={openDays.some((date) => mealOn(date))}
                canSuggest={openDays.some((date) => !mealOn(date))}
                copyTargets={weeks.filter((other) => other.offset >= 0 && other !== week)}
                hasMeals={week.days.some((date) => mealOn(date))}
                onClear={() => clear(week)}
                onCopyTo={(target) => copy(week, target)}
                onSuggest={() => suggest(week)}
                week={week}
              />
              <div className="col-span-full grid grid-cols-subgrid p-2 lg:p-3">
                {week.days.map((date) => {
                  const meal = mealOn(date);
                  return (
                    <PlannedDay
                      date={date}
                      entry={meal && entriesById.get(meal.recipeId)}
                      isPast={isPast(date, today)}
                      isToday={date.toDateString() === today.toDateString()}
                      key={date.toISOString()}
                      meal={meal}
                      onChoose={() => setPicker({ date, open: true })}
                      onMoveMeal={(from) => dropMeal(from, dayKey(date))}
                      onRemove={() =>
                        meal &&
                        removeMeal(
                          store,
                          user.id,
                          meal,
                          entriesById.get(meal.recipeId)?.recipe.title,
                        )
                      }
                      onShuffle={shuffler(week, date, meal)}
                      wasDroppedOn={droppedOn.includes(dayKey(date))}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

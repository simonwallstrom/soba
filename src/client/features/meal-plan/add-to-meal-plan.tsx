import {
  CommandPaletteContent,
  CommandPaletteContext,
  CommandPaletteFooter,
  CommandPaletteHint,
  CommandPaletteInput,
  CommandPaletteList,
} from "@client/components/particles/command-palette";
import { Button } from "@client/components/ui/button";
import {
  Combobox,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
} from "@client/components/ui/combobox";
import { Dialog, DialogClose } from "@client/components/ui/dialog";
import { toast } from "@client/components/ui/toast";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { plannedMeals$ } from "@client/features/meal-plan/queries";
import { dayKey, getWeek } from "@client/features/meal-plan/weeks";
import { recipes$ } from "@client/features/recipes/queries";
import { mealPlanned, mealUnplanned } from "@shared/meal-plan";
import type { PlannedMealRow } from "@shared/meal-plan";
import { useState } from "react";

// This week's remaining days and the weeks after it.
const weeksAhead = 3;

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const toastDayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

type PlanDay = { key: string; date: Date; label: string; planned: PlannedMealRow | undefined };
type PlanWeek = { value: string; items: string[] };

function normalize(text: string) {
  return text.trim().toLocaleLowerCase("sv");
}

function weekLabel(offset: number, number: number) {
  if (offset === 0) return "This week";
  if (offset === 1) return "Next week";
  return `Week ${number}`;
}

// Picks a day for a recipe: every day from today a few weeks out, each with what's planned.
// Picking a planned day replaces that meal, and the toast can take it back. It keeps showing
// its recipe while it closes, so the caller holds on to `recipe` after `open` drops.
export function AddToMealPlanDialog({
  householdId,
  onOpenChange,
  open,
  recipe,
  userId,
}: {
  householdId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  recipe: { id: string; title: string } | undefined;
  userId: string;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <CommandPaletteContent aria-label={`Add ${recipe?.title ?? "recipe"} to the meal plan`}>
        {recipe && (
          <DaySearch
            householdId={householdId}
            onPlanned={() => onOpenChange(false)}
            recipe={recipe}
            userId={userId}
          />
        )}
      </CommandPaletteContent>
    </Dialog>
  );
}

function DaySearch({
  householdId,
  onPlanned,
  recipe,
  userId,
}: {
  householdId: string;
  onPlanned: () => void;
  recipe: { id: string; title: string };
  userId: string;
}) {
  const store = useHouseholdStore(householdId);
  const rows = useHouseholdQuery(householdId, plannedMeals$);
  const recipes = useHouseholdQuery(householdId, recipes$);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState<string>();
  const titles = new Map(recipes.map((entry) => [entry.id, entry.title]));
  const plan = new Map(rows.map((row) => [row.date, row]));

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = new Map<string, PlanDay>();
  const weeks: PlanWeek[] = [];
  const needle = normalize(query);
  for (let offset = 0; offset <= weeksAhead; offset++) {
    const monday = new Date(today);
    monday.setDate(today.getDate() + offset * 7);
    const week = getWeek(monday);
    const items: string[] = [];
    for (const date of week.days) {
      if (date < today) continue;
      const key = dayKey(date);
      const planned = plan.get(key);
      const label = dayFormat.format(date);
      const plannedTitle = planned ? (titles.get(planned.recipeId) ?? "") : "";
      const searchable = `${label} ${toastDayFormat.format(date)} ${plannedTitle}`;
      if (!normalize(searchable).includes(needle)) continue;
      days.set(key, { key, date, label, planned });
      items.push(key);
    }
    if (items.length > 0) weeks.push({ value: weekLabel(offset, week.number), items });
  }

  function planOn(day: PlanDay) {
    const { key, date, planned: previous } = day;
    store.commit(
      mealPlanned({ date: key, recipeId: recipe.id, plannedBy: userId, plannedAt: new Date() }),
    );
    onPlanned();
    toast.add({
      title: `Planned for ${toastDayFormat.format(date)}`,
      description: recipe.title,
      actionProps: {
        children: "Undo",
        onClick: () =>
          store.commit(
            previous
              ? mealPlanned({
                  date: key,
                  recipeId: previous.recipeId,
                  ...(previous.suggestionId
                    ? {
                        suggestion: {
                          id: previous.suggestionId,
                          alternatives: previous.alternatives,
                        },
                      }
                    : {}),
                  plannedBy: userId,
                  plannedAt: new Date(),
                })
              : mealUnplanned({ date: key, unplannedBy: userId, unplannedAt: new Date() }),
          ),
      },
    });
  }

  const replaces = highlighted ? days.get(highlighted)?.planned : undefined;

  return (
    <Combobox
      autoHighlight
      inline
      // The days are matched above, so the combobox shows them as is.
      filter={null}
      inputValue={query}
      itemToStringLabel={(key: string) => days.get(key)?.label ?? ""}
      items={weeks}
      onInputValueChange={setQuery}
      onItemHighlighted={(key: string | undefined) => setHighlighted(key)}
      onValueChange={(key: string | null) => {
        const day = key ? days.get(key) : undefined;
        if (day) planOn(day);
      }}
      open
      value={null}
    >
      <CommandPaletteContext label="Plan">{recipe.title}</CommandPaletteContext>
      <CommandPaletteInput placeholder="Find a day or meal…" />
      <ComboboxEmpty>No days found.</ComboboxEmpty>
      <CommandPaletteList>
        {(week: PlanWeek) => (
          <ComboboxGroup items={week.items} key={week.value}>
            <ComboboxLabel>{week.value}</ComboboxLabel>
            <ComboboxCollection>
              {(key: string) => {
                const day = days.get(key);
                if (!day) return null;
                const isThisRecipe = day.planned?.recipeId === recipe.id;
                const plannedTitle = day.planned && titles.get(day.planned.recipeId);
                return (
                  <ComboboxItem disabled={isThisRecipe} key={key} value={key}>
                    {/* Dates share a width, so the planned meals line up. */}
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-24 shrink-0">{day.label}</span>
                      <span className="truncate text-olive-500">{plannedTitle}</span>
                      {isThisRecipe && (
                        <span className="-ml-2 shrink-0 text-olive-500">· this recipe</span>
                      )}
                    </span>
                  </ComboboxItem>
                );
              }}
            </ComboboxCollection>
          </ComboboxGroup>
        )}
      </CommandPaletteList>
      <CommandPaletteFooter>
        <CommandPaletteHint keys={["↵"]}>
          {replaces && replaces.recipeId !== recipe.id
            ? `Replace ${titles.get(replaces.recipeId) ?? "meal"}`
            : "Plan"}
        </CommandPaletteHint>
        <DialogClose render={<Button size="sm" variant="ghost" />}>
          <CommandPaletteHint keys={["esc"]}>Close</CommandPaletteHint>
        </DialogClose>
      </CommandPaletteFooter>
    </Combobox>
  );
}

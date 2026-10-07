import {
  mealPlanned,
  recipeProfiled,
  recipeProfileSource,
  recipeProfileSourceHash,
  recipeProfileVersion,
} from "@shared/meal-plan";
import { recipeCreated, tagCreated } from "@shared/recipes";

import { sampleRecipes } from "./sample-recipes";

// A month of dinners with the habits a real family has, so suggestions have something to learn
// from: fish early in the week, tacos most Fridays, and something slower on Sundays. Each
// weekday lists a dinner per week, oldest first; null leaves the day unplanned.
const sampleDinners: readonly (readonly (string | null)[])[] = [
  ["Ugnsbakad lax med dill", "Fiskgratäng med potatismos", "Ugnsbakad lax med dill", null],
  ["Korv stroganoff", "Kycklinggryta med curry", "Halloumistroganoff", "Chili con carne"],
  [
    "Köttfärssås med spaghetti",
    "Pasta carbonara",
    "Citronkyckling med rostad potatis",
    "Krämig svamprisotto",
  ],
  ["Pannkakor", "Krämig tomatsoppa", "Potatis- och purjolökssoppa", null],
  ["Tacos med rostad majs", "Tacos med rostad majs", null, "Tacos med rostad majs"],
  ["Pasta carbonara", "Raggmunk med fläsk", null, "Korv stroganoff"],
  [
    "Köttbullar med gräddsås",
    "Lasagne med soltorkade tomater",
    "Fiskgratäng med potatismos",
    "Citronkyckling med rostad potatis",
  ],
];

// The local calendar date, as meal plan events store it.
function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// The days of the weeks before `now`'s, Monday first, one list per week, oldest first.
function pastWeeks(now: Date, count: number) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: count }, (_, week) =>
    Array.from(
      { length: 7 },
      (__, day) =>
        new Date(
          monday.getFullYear(),
          monday.getMonth(),
          monday.getDate() + (week - count) * 7 + day,
        ),
    ),
  );
}

// The events that add every sample recipe, its tags and profile, and a month of dinners, all
// added by one user.
export function sampleRecipeEvents(userId: string, now = new Date()) {
  const tagIds = new Map(
    [...new Set(sampleRecipes.flatMap((recipe) => recipe.tags))].map((name) => [
      name,
      crypto.randomUUID(),
    ]),
  );
  const recipeIds = new Map(sampleRecipes.map((recipe) => [recipe.title, crypto.randomUUID()]));

  return [
    ...[...tagIds].map(([name, id]) => tagCreated({ id, name, createdAt: now })),
    ...sampleRecipes.flatMap(({ tags, createdAt, servings, profile, ...recipe }) => {
      const id = recipeIds.get(recipe.title) ?? crypto.randomUUID();
      return [
        recipeCreated({
          ...recipe,
          id,
          ...(servings === null ? {} : { servings }),
          tagIds: tags.flatMap((name) => tagIds.get(name) ?? []),
          createdBy: userId,
          createdAt: new Date(createdAt),
        }),
        recipeProfiled({
          recipeId: id,
          ...profile,
          version: recipeProfileVersion,
          sourceHash: recipeProfileSourceHash(recipeProfileSource(recipe)),
          profiledAt: new Date(createdAt),
        }),
      ];
    }),
    ...pastWeeks(now, 4).flatMap((days, week) =>
      days.flatMap((date, weekday) => {
        const recipeId = recipeIds.get(sampleDinners[weekday]?.[week] ?? "");
        return recipeId
          ? [mealPlanned({ date: dayKey(date), recipeId, plannedBy: userId, plannedAt: now })]
          : [];
      }),
    ),
  ];
}

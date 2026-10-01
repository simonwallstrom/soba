import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { useMembersById } from "@client/features/household/members";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import {
  recipeListSettings$,
  recipes$,
  recipeTags$,
  tags$,
} from "@client/features/recipes/queries";
import { compareNames, groupTagsByRecipe } from "@client/features/recipes/recipe-tags";
import { formatMetaTitle } from "@client/lib/meta";
import { recipeListSettings } from "@shared/recipes";
import { createFileRoute } from "@tanstack/react-router";

import { MealPlannerSidebar } from "./-components/meal-planner-sidebar";
import { RecipeList } from "./-components/recipe-list";
import { ActiveRecipeFilters, RecipesFilter } from "./-components/recipes-filters";
import { RecipesSearch } from "./-components/recipes-search";
import { RecipesToolbar } from "./-components/recipes-toolbar";
import { filterRecipes, hasRecipeFilters, parseRecipeListSearch } from "./-recipe-list";
import type { RecipeFilterField, RecipeListEntry } from "./-recipe-list";

export const Route = createFileRoute("/_authenticated/_app/recipes/")({
  validateSearch: parseRecipeListSearch,
  staticData: { breadcrumbs: [{ label: "Recipes" }] },
  component: Recipes,
});

function Recipes() {
  const { household } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const store = useHouseholdStore(household.id);
  const recipes = useHouseholdQuery(household.id, recipes$);
  const tags = useHouseholdQuery(household.id, tags$);
  const links = useHouseholdQuery(household.id, recipeTags$);
  const settings = useHouseholdQuery(household.id, recipeListSettings$);
  const membersById = useMembersById();

  const { sort } = settings;
  const tagsByRecipe = groupTagsByRecipe(tags, links);
  const toEntry = (recipe: RecipeListEntry["recipe"]): RecipeListEntry => ({
    recipe,
    tags: tagsByRecipe.get(recipe.id) ?? [],
    author: membersById?.get(recipe.createdBy),
  });
  const entries = filterRecipes(recipes, tagsByRecipe, search, sort).map(toEntry);
  const plannerEntries = filterRecipes(recipes, tagsByRecipe, {}, "name").map(toEntry);

  const sortedTags = tags.toSorted((left, right) => compareNames(left.name, right.name));
  const sortedMembers = [...(membersById?.values() ?? [])].toSorted((left, right) =>
    compareNames(left.name, right.name),
  );

  // Parsing drops empty filters, keeping URLs short.
  function changeSearch(change: Record<string, unknown>) {
    void navigate({
      replace: true,
      search: (current) => parseRecipeListSearch({ ...current, ...change }),
    });
  }

  function changeFilter(field: RecipeFilterField, ids: string[]) {
    changeSearch({ [field]: ids });
  }

  function clearFilters() {
    changeSearch({ q: "", tags: [], authors: [] });
  }

  function updateSettings(value: Partial<typeof settings>) {
    store.commit(recipeListSettings.set(value));
  }

  const filterProps = {
    tags: sortedTags,
    members: sortedMembers,
    filters: search,
    onChange: changeFilter,
  };

  return (
    <>
      <title>{formatMetaTitle("Recipes")}</title>
      <AppHeaderActions>
        <RecipesToolbar
          search={<RecipesSearch onChange={(q) => changeSearch({ q })} value={search.q ?? ""} />}
          filter={<RecipesFilter {...filterProps} />}
          isMealPlannerOpen={settings.isMealPlannerOpen}
          onMealPlannerOpenChange={(isMealPlannerOpen) => updateSettings({ isMealPlannerOpen })}
          onSortChange={(nextSort) => updateSettings({ sort: nextSort })}
          onViewChange={(view) => updateSettings({ view })}
          onVisibleDetailsChange={(visibleDetails) => updateSettings({ visibleDetails })}
          sort={sort}
          view={settings.view}
          visibleDetails={settings.visibleDetails}
        />
      </AppHeaderActions>
      <ActiveRecipeFilters {...filterProps} onClear={clearFilters} />
      <div className="p-2 lg:p-3">
        <RecipeList
          entries={entries}
          hasFilters={search.q !== undefined || hasRecipeFilters(search)}
          onClearFilters={clearFilters}
          sort={sort}
          view={settings.view}
          visibleDetails={settings.visibleDetails}
        />
      </div>
      {settings.isMealPlannerOpen && (
        <MealPlannerSidebar
          entries={plannerEntries}
          onClose={() => updateSettings({ isMealPlannerOpen: false })}
        />
      )}
    </>
  );
}

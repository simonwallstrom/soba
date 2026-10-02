import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "@client/components/ui/empty";
import { CookBookIcon } from "@client/components/ui/icons";
import {
  AddToCollectionDialog,
  useAddToCollectionDialog,
} from "@client/features/collections/add-to-collection-dialog";
import { useMembersById } from "@client/features/household/members";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import {
  recipeListSettings$,
  recipes$,
  recipeTags$,
  tags$,
} from "@client/features/recipes/queries";
import { RecipeActionsMenu } from "@client/features/recipes/recipe-actions-menu";
import { RecipeList } from "@client/features/recipes/recipe-list";
import type { RecipeListEntry } from "@client/features/recipes/recipe-list";
import { compareNames, groupTagsByRecipe } from "@client/features/recipes/recipe-tags";
import { formatMetaTitle } from "@client/lib/meta";
import { recipeListSettings } from "@shared/recipes";
import { createFileRoute, Link } from "@tanstack/react-router";

import { MealPlannerSidebar } from "./-components/meal-planner-sidebar";
import { ActiveRecipeFilters, RecipesFilter } from "./-components/recipes-filters";
import { RecipesSearch } from "./-components/recipes-search";
import { RecipesToolbar } from "./-components/recipes-toolbar";
import { filterRecipes, parseRecipeListSearch } from "./-recipe-list";
import type { RecipeFilterField } from "./-recipe-list";

export const Route = createFileRoute("/_authenticated/_app/recipes/")({
  validateSearch: parseRecipeListSearch,
  staticData: { breadcrumbs: [{ label: "Recipes" }] },
  component: Recipes,
});

function Recipes() {
  const { household, user } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const store = useHouseholdStore(household.id);
  const recipes = useHouseholdQuery(household.id, recipes$);
  const tags = useHouseholdQuery(household.id, tags$);
  const links = useHouseholdQuery(household.id, recipeTags$);
  const settings = useHouseholdQuery(household.id, recipeListSettings$);
  const membersById = useMembersById();
  const addToCollection = useAddToCollectionDialog();

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
      {/* Items pad their content, so an empty box takes that padding to line up with the header. */}
      <div className={recipes.length === 0 ? "p-5 lg:p-6" : "p-2 lg:p-3"}>
        {recipes.length === 0 ? (
          <Empty>
            <EmptyIcon>
              <CookBookIcon />
            </EmptyIcon>
            <EmptyHeader>
              <EmptyTitle>No recipes yet</EmptyTitle>
              <EmptyDescription>
                Add the recipes your family cooks, to find them and plan meals with.
              </EmptyDescription>
            </EmptyHeader>
            <Link className={buttonVariants({ variant: "primary" })} to="/recipes/new">
              New recipe
            </Link>
          </Empty>
        ) : entries.length === 0 ? (
          // Filtering is quick to undo, so no matches gets a lighter message than an empty household.
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
            <p className="font-medium">No matching recipes</p>
            <Button onClick={clearFilters} size="sm" variant="ghost">
              Clear filters
            </Button>
          </div>
        ) : (
          <RecipeList
            // Sorting by a date shows that date.
            date={sort === "name" ? undefined : sort}
            entries={entries}
            renderActions={({ recipe }) => (
              <RecipeActionsMenu
                onAddToCollection={() => addToCollection.openFor(recipe)}
                recipeTitle={recipe.title}
              />
            )}
            view={settings.view}
            visibleDetails={settings.visibleDetails}
          />
        )}
      </div>
      <AddToCollectionDialog
        householdId={household.id}
        userId={user.id}
        {...addToCollection.dialogProps}
      />
      {settings.isMealPlannerOpen && (
        <MealPlannerSidebar
          entries={plannerEntries}
          onClose={() => updateSettings({ isMealPlannerOpen: false })}
        />
      )}
    </>
  );
}

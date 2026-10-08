import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { AppToolbar } from "@client/components/particles/app-toolbar";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyTitle,
} from "@client/components/ui/empty";
import { useMembersById } from "@client/features/household/members";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { AddToMealPlanDialog } from "@client/features/meal-plan/add-to-meal-plan";
import { useFavorites } from "@client/features/recipes/favorites";
import {
  recipeListSettings$,
  recipes$,
  recipeTags$,
  tags$,
} from "@client/features/recipes/queries";
import { RecipeActionsMenu } from "@client/features/recipes/recipe-actions-menu";
import {
  onRecipeImported,
  useRecentlyImported,
} from "@client/features/recipes/recipe-import-watcher";
import { recipeImportsOptions } from "@client/features/recipes/recipe-imports";
import { RecipeList } from "@client/features/recipes/recipe-list";
import type { RecipeListEntry } from "@client/features/recipes/recipe-list";
import { compareNames, groupTagsByRecipe } from "@client/features/recipes/recipe-tags";
import { formatMetaTitle } from "@client/lib/meta";
import { recipeDeleted, recipeListSettings } from "@shared/recipes";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { MealPlannerSidebar } from "./-components/meal-planner-sidebar";
import { PendingImports } from "./-components/pending-imports";
import { RecipeImportDialog } from "./-components/recipe-import-dialog";
import type { ImportSource } from "./-components/recipe-import-dialog";
import { ActiveRecipeFilters, RecipesFilter } from "./-components/recipes-filters";
import { RecipesSearch } from "./-components/recipes-search";
import { RecipesHeaderActions, RecipesToolbar } from "./-components/recipes-toolbar";
import { filterRecipes, parseRecipeListSearch, pinFirst } from "./-recipe-list";
import { recipeFilterFields } from "./-recipe-list";
import type { RecipeFilterField, RecipeListFilters } from "./-recipe-list";

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
  const { favoriteIds, toggleFavorite } = useFavorites(household.id, user.id);
  const recipes = useHouseholdQuery(household.id, recipes$);
  const tags = useHouseholdQuery(household.id, tags$);
  const links = useHouseholdQuery(household.id, recipeTags$);
  const settings = useHouseholdQuery(household.id, recipeListSettings$);
  const membersById = useMembersById();
  const [importSource, setImportSource] = useState<ImportSource | null>(null);
  const { data: imports = [] } = useQuery(recipeImportsOptions);
  const recentlyImported = useRecentlyImported();
  const tagNames = tags.map((tag) => tag.name);
  // Imports on their way count as content, so a new household sees its first import arrive.
  const isEmpty = recipes.length === 0 && imports.length === 0;

  const { sort } = settings;
  const tagsByRecipe = groupTagsByRecipe(tags, links);
  const toEntry = (recipe: RecipeListEntry["recipe"]): RecipeListEntry => ({
    recipe,
    tags: tagsByRecipe.get(recipe.id) ?? [],
    author: membersById?.get(recipe.createdBy),
  });
  // Imported while this page is open, newest first: they stay on top until the member leaves,
  // rather than vanishing into the sort order the moment they arrive.
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  // The dialog keeps its recipe while it closes.
  const [planning, setPlanning] = useState<{ open: boolean; recipe?: RecipeListEntry["recipe"] }>({
    open: false,
  });
  useEffect(() => onRecipeImported((id) => setPinnedIds((ids) => [id, ...ids])), []);
  const entries = pinFirst(filterRecipes(recipes, tagsByRecipe, search, sort), pinnedIds).map(
    toEntry,
  );
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
        <RecipesHeaderActions
          isMealPlannerOpen={settings.isMealPlannerOpen}
          onImport={setImportSource}
          onMealPlannerOpenChange={(isMealPlannerOpen) => updateSettings({ isMealPlannerOpen })}
        />
      </AppHeaderActions>
      <RecipeImportDialog
        onOpenChange={(open) => {
          if (!open) setImportSource(null);
        }}
        source={importSource}
        tagNames={tagNames}
      />
      {/* With no recipes yet, there is nothing to search or sort. */}
      <AppToolbar>
        {recipes.length > 0 && (
          <RecipesToolbar
            activeFilters={<ActiveRecipeFilters {...filterProps} onClear={clearFilters} />}
            filter={<RecipesFilter {...filterProps} />}
            onSortChange={(nextSort) => updateSettings({ sort: nextSort })}
            onViewChange={(view) => updateSettings({ view })}
            onVisibleDetailsChange={(visibleDetails) => updateSettings({ visibleDetails })}
            search={
              <RecipesSearch
                className="min-w-0 flex-1 self-stretch"
                onChange={(q) => changeSearch({ q })}
                value={search.q ?? ""}
              />
            }
            sort={sort}
            view={settings.view}
            visibleDetails={settings.visibleDetails}
          />
        )}
      </AppToolbar>
      {/* Items pad their content, so an empty box takes that padding to line up with the header. */}
      {/* Fills the page, so an empty state centers in it. */}
      <div className="flex min-h-full flex-col p-2 lg:p-3">
        {imports.length > 0 && (
          <PendingImports
            imports={imports}
            onImportPhoto={() => setImportSource("photos")}
            tagNames={tagNames}
            view={settings.view}
          />
        )}
        {recipes.length === 0 ? (
          isEmpty && (
            <Empty>
              <EmptyIllustration
                className="w-44"
                height="178"
                src="/images/empty-chopsticks.avif"
                width="360"
              />
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
          )
        ) : entries.length === 0 ? (
          // Filtering is quick to undo, so no matches gets a lighter message than an empty household.
          <Empty>
            <EmptyIllustration
              className="w-32"
              height="178"
              src="/images/empty-chopsticks.avif"
              width="360"
            />
            <EmptyHeader>
              <EmptyTitle>No matching recipes</EmptyTitle>
              <EmptyDescription>{noMatchesDescription(search)}</EmptyDescription>
            </EmptyHeader>
            <Button onClick={clearFilters}>
              {hasFilters(search) ? "Clear filters" : "Clear search"}
            </Button>
          </Empty>
        ) : (
          <RecipeList
            canDrag={settings.isMealPlannerOpen}
            // Sorting by a date shows that date.
            date={sort === "name" ? undefined : sort}
            entries={entries}
            highlightedIds={recentlyImported}
            newIds={new Set(pinnedIds)}
            renderActions={({ recipe }) => (
              <RecipeActionsMenu
                isFavorite={favoriteIds.has(recipe.id)}
                onAddToMealPlan={() => setPlanning({ open: true, recipe })}
                onDelete={() =>
                  store.commit(
                    recipeDeleted({ id: recipe.id, deletedBy: user.id, deletedAt: new Date() }),
                  )
                }
                onToggleFavorite={() => toggleFavorite(recipe.id)}
                recipeId={recipe.id}
                recipeTitle={recipe.title}
              />
            )}
            view={settings.view}
            visibleDetails={settings.visibleDetails}
          />
        )}
      </div>
      {settings.isMealPlannerOpen && (
        <MealPlannerSidebar
          entries={plannerEntries}
          householdId={household.id}
          onClose={() => updateSettings({ isMealPlannerOpen: false })}
          userId={user.id}
        />
      )}
      <AddToMealPlanDialog
        householdId={household.id}
        onOpenChange={(open) => setPlanning((current) => ({ ...current, open }))}
        open={planning.open}
        recipe={planning.recipe}
        userId={user.id}
      />
    </>
  );
}

function hasFilters(search: RecipeListFilters) {
  return recipeFilterFields.some((field) => (search[field]?.length ?? 0) > 0);
}

// Says what is hiding the recipes, so it's clear what clearing will bring back.
function noMatchesDescription(search: RecipeListFilters) {
  if (!search.q) return "No recipes match these filters.";
  if (!hasFilters(search)) return `Nothing matches “${search.q}”.`;
  return `Nothing matches “${search.q}” with these filters.`;
}

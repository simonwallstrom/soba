import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyTitle,
} from "@client/components/ui/empty";
import { useMembersById } from "@client/features/household/members";
import { AddToMealPlanDialog } from "@client/features/meal-plan/add-to-meal-plan";
import { useRecipeListSettings } from "@client/features/recipes/list-settings";
import { RecipeActionsMenu } from "@client/features/recipes/recipe-actions-menu";
import {
  deleteRecipe,
  useFavorites,
  useRecipes,
  useTags,
} from "@client/features/recipes/recipe-data";
import {
  onRecipeImported,
  useRecentlyImported,
} from "@client/features/recipes/recipe-import-watcher";
import { recipeImportsOptions } from "@client/features/recipes/recipe-imports";
import { RecipeList } from "@client/features/recipes/recipe-list";
import type { RecipeListEntry } from "@client/features/recipes/recipe-list";
import {
  compareNames,
  groupTagsByRecipe,
  recipeTagLinks,
} from "@client/features/recipes/recipe-tags";
import { ShareRecipeDialog } from "@client/features/recipes/share-recipe-dialog";
import { formatMetaTitle } from "@client/lib/meta";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { MealPlannerSidebar } from "./-components/meal-planner-sidebar";
import { PendingImports } from "./-components/pending-imports";
import { RecipeImportDialog } from "./-components/recipe-import-dialog";
import type { ImportSource } from "./-components/recipe-import-dialog";
import { ActiveRecipeFilters, RecipesFilter } from "./-components/recipes-filters";
import { RecipesDisplayMenu, RecipesHeaderActions } from "./-components/recipes-header-actions";
import { RecipesSearch } from "./-components/recipes-search";
import { filterRecipes, hasFilters, parseRecipeListSearch, pinFirst } from "./-recipe-list";
import type { RecipeFilterField, RecipeListFilters } from "./-recipe-list";

export const Route = createFileRoute("/_authenticated/_app/recipes/")({
  validateSearch: parseRecipeListSearch,
  staticData: { breadcrumbs: [{ label: "Recipes" }] },
  component: Recipes,
});

function Recipes() {
  const { user } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const recipes = useRecipes();
  const tags = useTags();
  const [settings, updateSettings] = useRecipeListSettings();
  const membersById = useMembersById();
  const [importSource, setImportSource] = useState<ImportSource | null>(null);
  const { data: allImports = [] } = useQuery(recipeImportsOptions);
  // A saved import can reach the list as a recipe before it is announced; show it once.
  const imports = allImports.filter((item) => !recipes.some((recipe) => recipe.id === item.id));
  const recentlyImported = useRecentlyImported();
  // Imports on their way count as content, so a new household sees its first import arrive.
  const isEmpty = recipes.length === 0 && imports.length === 0;

  const { sort } = settings;
  const tagsByRecipe = groupTagsByRecipe(tags, recipeTagLinks(recipes));
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
  // Kept by ID, so the dialog shows the link as it changes, not as it was when opened.
  const [sharing, setSharing] = useState<{ open: boolean; recipeId?: string }>({ open: false });
  const sharedRecipe = recipes.find((recipe) => recipe.id === sharing.recipeId);
  useEffect(() => onRecipeImported((id) => setPinnedIds((ids) => [id, ...ids])), []);
  const entries = pinFirst(
    filterRecipes(recipes, tagsByRecipe, search, sort, favoriteIds),
    pinnedIds,
  ).map(toEntry);
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
    changeSearch({ q: "", tags: [], authors: [], favorites: false, shared: false });
  }

  const filterProps = {
    tags: sortedTags,
    members: sortedMembers,
    filters: search,
    onChange: changeFilter,
    onFavoritesChange: (favorites: boolean) => changeSearch({ favorites }),
    onSharedChange: (shared: boolean) => changeSearch({ shared }),
  };

  return (
    <>
      <title>{formatMetaTitle("Recipes")}</title>
      <AppHeaderActions>
        <RecipesHeaderActions
          isMealPlannerOpen={settings.isMealPlannerOpen}
          // With no recipes yet, there is nothing to search or sort.
          listControls={
            recipes.length > 0 && (
              <>
                <RecipesSearch
                  className="min-w-0 max-sm:data-[expanded=true]:mr-2 max-sm:data-[expanded=true]:flex-1 sm:mr-1 sm:max-w-64 sm:flex-1"
                  onChange={(q) => changeSearch({ q })}
                  value={search.q ?? ""}
                />
                <RecipesFilter {...filterProps} />
                <RecipesDisplayMenu
                  onSortChange={(nextSort) => updateSettings({ sort: nextSort })}
                  onViewChange={(view) => updateSettings({ view })}
                  onVisibleDetailsChange={(visibleDetails) => updateSettings({ visibleDetails })}
                  sort={sort}
                  view={settings.view}
                  visibleDetails={settings.visibleDetails}
                />
              </>
            )
          }
          onImport={setImportSource}
          onMealPlannerOpenChange={(isMealPlannerOpen) => updateSettings({ isMealPlannerOpen })}
        />
      </AppHeaderActions>
      <RecipeImportDialog
        onOpenChange={(open) => {
          if (!open) setImportSource(null);
        }}
        source={importSource}
      />
      {/* Items pad their content, so an empty box takes that padding to line up with the header. */}
      {/* Fills the page, so an empty state centers in it. */}
      <div className="flex min-h-full flex-col p-2 lg:p-3">
        {recipes.length > 0 && <ActiveRecipeFilters {...filterProps} onClear={clearFilters} />}
        {imports.length > 0 && (
          <PendingImports
            imports={imports}
            onImportPhoto={() => setImportSource("photos")}
            view={settings.view}
          />
        )}
        {recipes.length === 0 ? (
          isEmpty && (
            <Empty>
              <EmptyIllustration height="512" src="/images/empty-recipes-plate.avif" width="512" />
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
              height="512"
              src="/images/empty-recipes-no-results-bowl.avif"
              width="512"
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
                onDelete={() => void deleteRecipe(recipe.id)}
                onShare={() => setSharing({ open: true, recipeId: recipe.id })}
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
          onClose={() => updateSettings({ isMealPlannerOpen: false })}
          userId={user.id}
        />
      )}
      <AddToMealPlanDialog
        onOpenChange={(open) => setPlanning((current) => ({ ...current, open }))}
        open={planning.open}
        recipe={planning.recipe}
        userId={user.id}
      />
      {sharedRecipe && (
        <ShareRecipeDialog
          onOpenChange={(open) => setSharing((current) => ({ ...current, open }))}
          open={sharing.open}
          recipe={sharedRecipe}
        />
      )}
    </>
  );
}

// Says what is hiding the recipes, so it's clear what clearing will bring back.
function noMatchesDescription(search: RecipeListFilters) {
  if (!search.q) return "No recipes match these filters.";
  if (!hasFilters(search)) return `Nothing matches “${search.q}”.`;
  return `Nothing matches “${search.q}” with these filters.`;
}

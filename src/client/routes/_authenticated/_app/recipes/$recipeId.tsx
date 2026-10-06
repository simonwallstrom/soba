import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { Button } from "@client/components/ui/button";
import { ServingFoodIcon, StarIcon } from "@client/components/ui/icons";
import { ImagePlaceholder } from "@client/components/ui/image-thumbnail";
import { useMembersById } from "@client/features/household/members";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { AddToMealPlanDialog } from "@client/features/meal-plan/add-to-meal-plan";
import { useFavorites } from "@client/features/recipes/favorites";
import { recipe$, recipeTags$, tags$ } from "@client/features/recipes/queries";
import { RecipeActionsMenu } from "@client/features/recipes/recipe-actions-menu";
import { groupTagsByRecipe } from "@client/features/recipes/recipe-tags";
import { formatMetaTitle } from "@client/lib/meta";
import { recipeDeleted } from "@shared/recipes";
import type { Recipe } from "@shared/recipes";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { RecipeContent } from "./-components/recipe-content";
import { RecipeByline, RecipeTagLinks } from "./-components/recipe-meta";
import { RecipeNotFound } from "./-components/recipe-not-found";

export const Route = createFileRoute("/_authenticated/_app/recipes/$recipeId")({
  staticData: {
    breadcrumbs: [{ label: "Recipes", link: { to: "/recipes" } }, { label: RecipeTitle }],
  },
  component: RecipeDetail,
});

function useRecipe(): Recipe | undefined {
  const { household } = Route.useRouteContext();
  const { recipeId } = Route.useParams();
  return useHouseholdQuery(household.id, recipe$(recipeId));
}

function RecipeTitle(): string {
  return useRecipe()?.title ?? "Recipe";
}

function RecipeDetail() {
  const { household, user } = Route.useRouteContext();
  const navigate = useNavigate();
  const store = useHouseholdStore(household.id);
  const recipe = useRecipe();
  const tags = useHouseholdQuery(household.id, tags$);
  const links = useHouseholdQuery(household.id, recipeTags$);
  const membersById = useMembersById();
  const { favoriteIds, toggleFavorite } = useFavorites(household.id, user.id);
  const [isPlanning, setIsPlanning] = useState(false);

  // A wrong link, or a recipe deleted while open, perhaps on another device.
  if (!recipe) return <RecipeNotFound />;

  const recipeTags = groupTagsByRecipe(tags, links).get(recipe.id) ?? [];
  const author = membersById?.get(recipe.createdBy);
  const isFavorite = favoriteIds.has(recipe.id);

  // Leaves first, so the page does not flash as not found. Replaces it, so back skips it.
  async function deleteRecipe(id: string) {
    await navigate({ to: "/recipes", replace: true });
    store.commit(recipeDeleted({ id, deletedBy: user.id, deletedAt: new Date() }));
  }

  return (
    <>
      <title>{formatMetaTitle(recipe.title)}</title>
      <AppHeaderActions>
        {/* Favoriting belongs with the name; editing is rare enough for the menu. Phones show a
            back link instead of the title, so there the star stays beside the menu. */}
        <FavoriteButton
          className="lg:mr-auto"
          isFavorite={isFavorite}
          onToggle={() => toggleFavorite(recipe.id)}
        />
        <RecipeActionsMenu
          className="-mr-2"
          isFavorite={isFavorite}
          onAddToMealPlan={() => setIsPlanning(true)}
          onDelete={() => void deleteRecipe(recipe.id)}
          onToggleFavorite={() => toggleFavorite(recipe.id)}
          recipeId={recipe.id}
          recipeTitle={recipe.title}
          size="icon"
        />
      </AppHeaderActions>
      <AddToMealPlanDialog
        householdId={household.id}
        onOpenChange={setIsPlanning}
        open={isPlanning}
        recipe={recipe}
        userId={user.id}
      />
      <article className="mx-auto flex max-w-5xl flex-col gap-8 p-5 lg:gap-12 lg:p-12">
        {/* The photo leads on small screens and sits beside the text on large ones. */}
        <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-center lg:gap-16">
          {recipe.imageUrl ? (
            <img
              alt={recipe.title}
              className="-mx-5 -mt-5 aspect-5/4 w-[calc(100%+2.5rem)] max-w-none object-cover lg:col-start-2 lg:row-start-1 lg:m-0 lg:w-full lg:rounded-xl"
              decoding="async"
              height="1100"
              src={recipe.imageUrl}
              width="1200"
            />
          ) : (
            <ImagePlaceholder className="aspect-5/4 w-full rounded-xl max-lg:hidden lg:col-start-2 lg:row-start-1 [&_svg]:size-12">
              <ServingFoodIcon />
            </ImagePlaceholder>
          )}
          <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
            <RecipeByline
              author={author}
              createdAt={recipe.createdAt}
              sourceUrl={recipe.sourceUrl}
            />
            <h1 className="text-3xl font-medium tracking-tight text-balance">{recipe.title}</h1>
            {recipe.description && (
              <p className="max-w-xl text-base leading-6 text-pretty text-olive-600 dark:text-olive-400">
                {recipe.description}
              </p>
            )}
            <div className="mt-3 empty:hidden">
              <RecipeTagLinks tags={recipeTags} />
            </div>
          </div>
        </header>

        <RecipeContent
          ingredients={recipe.ingredients}
          instructions={recipe.instructions}
          servings={recipe.servings}
        />
      </article>
    </>
  );
}

function FavoriteButton({
  className,
  isFavorite,
  onToggle,
}: {
  className?: string;
  isFavorite: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      aria-label="Favorite"
      aria-pressed={isFavorite}
      className={className}
      onClick={onToggle}
      size="icon"
      variant="ghost"
    >
      {/* Filled and yellow once favorited, like stars elsewhere. */}
      <StarIcon
        className={isFavorite ? "text-amber-400 dark:text-amber-300" : undefined}
        fill={isFavorite ? "currentColor" : "none"}
      />
    </Button>
  );
}

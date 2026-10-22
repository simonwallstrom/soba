import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { Button } from "@client/components/ui/button";
import { Share08Icon, StarIcon } from "@client/components/ui/icons";
import { WithTooltip } from "@client/components/ui/tooltip";
import { useMembersById } from "@client/features/household/members";
import { AddToMealPlanDialog } from "@client/features/meal-plan/add-to-meal-plan";
import { RecipeActionsMenu } from "@client/features/recipes/recipe-actions-menu";
import { decimalSeparatorFor, RecipeContent } from "@client/features/recipes/recipe-content";
import {
  deleteRecipe as saveRecipeDeleted,
  useFavorites,
  useRecipe as useRecipeById,
  useTags,
} from "@client/features/recipes/recipe-data";
import { RecipeHeader } from "@client/features/recipes/recipe-header";
import { compareNames } from "@client/features/recipes/recipe-tags";
import { ShareRecipeDialog } from "@client/features/recipes/share-recipe-dialog";
import { formatMetaTitle } from "@client/lib/meta";
import type { Recipe } from "@shared/recipes";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { RecipeByline, RecipeTagLinks } from "./-components/recipe-meta";
import { RecipeNotFound } from "./-components/recipe-not-found";

export const Route = createFileRoute("/_authenticated/_app/recipes/$recipeId")({
  staticData: {
    breadcrumbs: [{ label: "Recipes", link: { to: "/recipes" } }, { label: RecipeTitle }],
  },
  component: RecipeDetail,
});

function useRecipe(): Recipe | undefined {
  const { recipeId } = Route.useParams();
  return useRecipeById(recipeId);
}

function RecipeTitle(): string {
  return useRecipe()?.title ?? "Recipe";
}

function RecipeDetail() {
  const { recipeId } = Route.useParams();
  const { household, user } = Route.useRouteContext();
  const navigate = useNavigate();
  const recipe = useRecipe();
  const tags = useTags();
  const membersById = useMembersById();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [isPlanning, setIsPlanning] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // A wrong link, or a recipe deleted while open, perhaps on another device.
  if (!recipe) return <RecipeNotFound recipeId={recipeId} />;

  const recipeTags = tags
    .filter((tag) => recipe.tagIds.includes(tag.id))
    .toSorted((left, right) => compareNames(left.name, right.name));
  const author = membersById?.get(recipe.createdBy);
  const isFavorite = favoriteIds.has(recipe.id);

  // Leaves first, so the page does not flash as not found. Replaces it, so back skips it.
  async function deleteRecipe(deleted: Recipe) {
    await navigate({ to: "/recipes", replace: true });
    saveRecipeDeleted(deleted, user.id);
  }

  return (
    <>
      <title>{formatMetaTitle(recipe.title)}</title>
      <AppHeaderActions>
        {/* Favoriting and sharing belong with the name; editing is rare enough for the menu.
            Phones show a back link instead of the title, so there they stay beside the menu. */}
        <FavoriteButton isFavorite={isFavorite} onToggle={() => toggleFavorite(recipe.id)} />
        <ShareButton isShared={recipe.isShared} onClick={() => setIsSharing(true)} />
        <RecipeActionsMenu
          className="-mr-2"
          isFavorite={isFavorite}
          onAddToMealPlan={() => setIsPlanning(true)}
          onDelete={() => void deleteRecipe(recipe)}
          onShare={() => setIsSharing(true)}
          onToggleFavorite={() => toggleFavorite(recipe.id)}
          recipeId={recipe.id}
          recipeTitle={recipe.title}
          size="icon"
          tooltip="More actions"
        />
      </AppHeaderActions>
      <AddToMealPlanDialog
        onOpenChange={setIsPlanning}
        open={isPlanning}
        recipe={recipe}
        userId={user.id}
      />
      <ShareRecipeDialog onOpenChange={setIsSharing} open={isSharing} recipe={recipe} />
      <article className="mx-auto flex max-w-5xl flex-col gap-5 p-5 lg:gap-12 lg:p-12">
        <RecipeHeader
          byline={<RecipeByline author={author} createdAt={recipe.createdAt} />}
          description={recipe.description}
          imageUrl={recipe.imageUrl}
          title={recipe.title}
        >
          <RecipeTagLinks tags={recipeTags} />
        </RecipeHeader>

        <RecipeContent
          decimalSeparator={decimalSeparatorFor(household.language)}
          ingredients={recipe.ingredients}
          instructions={recipe.instructions}
          key={recipe.id}
          recipeId={recipe.id}
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
    <WithTooltip label={isFavorite ? "Remove from favorites" : "Add to favorites"}>
      <Button
        aria-label="Favorite"
        aria-pressed={isFavorite}
        className={className}
        onClick={onToggle}
        size="icon"
        variant="ghost"
      >
        {/* Quiet like the share button beside it, then filled and yellow once favorited, like stars
          elsewhere. */}
        <StarIcon
          className={
            isFavorite ? "text-amber-400 dark:text-amber-300" : "text-olive-600 dark:text-olive-400"
          }
          fill={isFavorite ? "currentColor" : "none"}
        />
      </Button>
    </WithTooltip>
  );
}

// Quiet like the header's other actions, and filled while anyone with the link can view the
// recipe. Not yellow, which says favorite beside it.
function ShareButton({ isShared, onClick }: { isShared: boolean; onClick: () => void }) {
  return (
    <WithTooltip label="Share recipe">
      <Button
        aria-label={isShared ? "Share recipe, shared with a link" : "Share recipe"}
        className="lg:mr-auto"
        onClick={onClick}
        size="icon"
        variant="ghost"
      >
        {/* One dot on the left and two on the right weigh it right of center, so it moves back. */}
        <Share08Icon
          className="-translate-x-px text-olive-600 dark:text-olive-400"
          fill={isShared ? "currentColor" : "none"}
        />
      </Button>
    </WithTooltip>
  );
}

import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { Button, buttonVariants } from "@client/components/ui/button";
import { ServingFoodIcon, StarIcon } from "@client/components/ui/icons";
import { ImagePlaceholder } from "@client/components/ui/image-thumbnail";
import { useMembersById } from "@client/features/household/members";
import { householdStoreOptions, useHouseholdQuery } from "@client/features/household/store";
import { useFavorites } from "@client/features/recipes/favorites";
import { recipe$, recipeTags$, tags$ } from "@client/features/recipes/queries";
import { RecipeActionsMenu } from "@client/features/recipes/recipe-actions-menu";
import { groupTagsByRecipe } from "@client/features/recipes/recipe-tags";
import { storeRegistry } from "@client/lib/livestore/adapter";
import { formatMetaTitle } from "@client/lib/meta";
import type { Recipe } from "@shared/recipes";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { RecipeContent } from "./-components/recipe-content";
import { RecipeByline, RecipeTagLinks } from "./-components/recipe-meta";
import { RecipeNotFound } from "./-components/recipe-not-found";

export const Route = createFileRoute("/_authenticated/_app/recipes/$recipeId")({
  // Waits for the local store on first open so a missing recipe shows as not found.
  loader: async ({ context, params }) => {
    const store = await storeRegistry.getOrLoadPromise(householdStoreOptions(context.household.id));
    if (!store.query(recipe$(params.recipeId))) throw notFound();
  },
  staticData: {
    breadcrumbs: [{ label: "Recipes", link: { to: "/recipes" } }, { label: RecipeTitle }],
  },
  component: RecipeDetail,
  notFoundComponent: RecipeNotFound,
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
  const recipe = useRecipe();
  const tags = useHouseholdQuery(household.id, tags$);
  const links = useHouseholdQuery(household.id, recipeTags$);
  const membersById = useMembersById();
  const { favoriteIds, toggleFavorite } = useFavorites(household.id, user.id);

  // The recipe was deleted while open, perhaps on another device.
  if (!recipe) return <RecipeNotFound />;

  const recipeTags = groupTagsByRecipe(tags, links).get(recipe.id) ?? [];
  const author = membersById?.get(recipe.createdBy);
  const isFavorite = favoriteIds.has(recipe.id);

  return (
    <>
      <title>{formatMetaTitle(recipe.title)}</title>
      <AppHeaderActions>
        <div className="-mr-2 flex items-center gap-1">
          <Link
            className={buttonVariants({ variant: "ghost" })}
            params={{ recipeId: recipe.id }}
            to="/recipes/$recipeId/edit"
          >
            Edit
          </Link>
          <Button
            aria-label="Favorite"
            aria-pressed={isFavorite}
            onClick={() => toggleFavorite(recipe.id)}
            size="icon"
            variant="ghost"
          >
            <StarIcon fill={isFavorite ? "currentColor" : "none"} />
          </Button>
          <RecipeActionsMenu
            isFavorite={isFavorite}
            onToggleFavorite={() => toggleFavorite(recipe.id)}
            recipeId={recipe.id}
            recipeTitle={recipe.title}
            size="icon"
          />
        </div>
      </AppHeaderActions>
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
            <RecipeByline author={author} createdAt={recipe.createdAt} />
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

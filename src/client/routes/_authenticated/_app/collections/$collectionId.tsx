import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { buttonVariants } from "@client/components/ui/button";
import { DropdownMenuItem } from "@client/components/ui/dropdown-menu";
import { MinusSignIcon } from "@client/components/ui/icons";
import {
  AddToCollectionDialog,
  useAddToCollectionDialog,
} from "@client/features/collections/add-to-collection-dialog";
import { CollectionActionsMenu } from "@client/features/collections/collection-actions-menu";
import { groupRecipesByCollection } from "@client/features/collections/collection-recipes";
import { formatRecipeCount } from "@client/features/collections/collection-values";
import { collection$, collectionRecipes$ } from "@client/features/collections/queries";
import { useMembersById } from "@client/features/household/members";
import {
  householdStoreOptions,
  useHouseholdQuery,
  useHouseholdStore,
} from "@client/features/household/store";
import {
  recipeListSettings$,
  recipes$,
  recipeTags$,
  tags$,
} from "@client/features/recipes/queries";
import { RecipeActionsMenu } from "@client/features/recipes/recipe-actions-menu";
import { RecipeList } from "@client/features/recipes/recipe-list";
import { groupTagsByRecipe } from "@client/features/recipes/recipe-tags";
import { storeRegistry } from "@client/lib/livestore/adapter";
import { formatMetaTitle } from "@client/lib/meta";
import { recipeRemovedFromCollection } from "@shared/recipes";
import type { Collection } from "@shared/recipes";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/collections/$collectionId")({
  // Waits for the local store on first open so a missing collection shows as not found.
  loader: async ({ context, params }) => {
    const store = await storeRegistry.getOrLoadPromise(householdStoreOptions(context.household.id));
    if (!store.query(collection$(params.collectionId))) throw notFound();
  },
  staticData: {
    breadcrumbs: [
      { label: "Collections", link: { to: "/collections" } },
      { label: CollectionTitle },
    ],
  },
  component: CollectionDetail,
  notFoundComponent: CollectionNotFound,
});

function useCollection(): Collection | undefined {
  const { household } = Route.useRouteContext();
  const { collectionId } = Route.useParams();
  return useHouseholdQuery(household.id, collection$(collectionId));
}

function CollectionTitle(): string {
  return useCollection()?.title ?? "Collection";
}

function CollectionDetail() {
  const { household, user } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const store = useHouseholdStore(household.id);
  const collection = useCollection();
  const links = useHouseholdQuery(household.id, collectionRecipes$);
  const recipes = useHouseholdQuery(household.id, recipes$);
  const tags = useHouseholdQuery(household.id, tags$);
  const tagLinks = useHouseholdQuery(household.id, recipeTags$);
  // Recipes look the same here as in the recipe list.
  const settings = useHouseholdQuery(household.id, recipeListSettings$);
  const membersById = useMembersById();
  const addToCollection = useAddToCollectionDialog();

  // The collection was deleted while open, perhaps on another device.
  if (!collection) return <CollectionNotFound />;

  const tagsByRecipe = groupTagsByRecipe(tags, tagLinks);
  const entries = (groupRecipesByCollection(links, recipes).get(collection.id) ?? []).map(
    (recipe) => ({
      recipe,
      tags: tagsByRecipe.get(recipe.id) ?? [],
      author: membersById?.get(recipe.createdBy),
    }),
  );

  const collectionId = collection.id;
  function removeRecipe(recipeId: string) {
    store.commit(
      recipeRemovedFromCollection({
        collectionId,
        recipeId,
        removedBy: user.id,
        removedAt: new Date(),
      }),
    );
  }

  return (
    <>
      <title>{formatMetaTitle(collection.title)}</title>
      <AppHeaderActions>
        <div className="-mr-2 flex items-center">
          <CollectionActionsMenu
            collection={collection}
            householdId={household.id}
            onDeleted={() => void navigate({ to: "/collections", replace: true })}
            size="icon"
            userId={user.id}
          />
        </div>
      </AppHeaderActions>
      <header className="flex flex-col gap-1 px-5 pt-5 lg:px-6 lg:pt-6">
        <h1 className="text-2xl font-medium tracking-tight text-balance">{collection.title}</h1>
        {collection.description && (
          <p className="max-w-xl text-pretty text-olive-600 dark:text-olive-400">
            {collection.description}
          </p>
        )}
        {entries.length > 0 && (
          <p className="text-sm text-olive-500">{formatRecipeCount(entries.length)}</p>
        )}
      </header>
      <div className="p-2 lg:p-3">
        {entries.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
            <p className="font-medium">No recipes yet</p>
            <p className="max-w-sm text-olive-500">
              Add recipes with “Add to collection…” in a recipe’s menu.
            </p>
            <Link className={buttonVariants({ className: "mt-2", size: "sm" })} to="/recipes">
              Go to recipes
            </Link>
          </div>
        ) : (
          <RecipeList
            // Ordered by when recipes were added, so no recipe date is shown.
            date={undefined}
            entries={entries}
            renderActions={({ recipe }) => (
              <RecipeActionsMenu
                onAddToCollection={() => addToCollection.openFor(recipe)}
                recipeTitle={recipe.title}
              >
                <DropdownMenuItem onClick={() => removeRecipe(recipe.id)}>
                  <MinusSignIcon />
                  Remove from collection
                </DropdownMenuItem>
              </RecipeActionsMenu>
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
    </>
  );
}

function CollectionNotFound() {
  return (
    <div className="flex flex-col items-start gap-2 p-5 lg:p-6">
      <title>{formatMetaTitle("Collection not found")}</title>
      <h1 className="text-xl font-medium">Collection not found</h1>
      <p>It may have been deleted, or the link is wrong.</p>
      <Link className="underline" to="/collections">
        Back to collections
      </Link>
    </div>
  );
}

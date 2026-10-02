import { AppHeaderActions } from "@client/components/particles/app-header-actions";
import { MediaGridItem, MediaItems, MediaListItem } from "@client/components/particles/media-item";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { Add01Icon, Sorting03Icon } from "@client/components/ui/icons";
import { CollectionActionsMenu } from "@client/features/collections/collection-actions-menu";
import { CollectionDialog } from "@client/features/collections/collection-dialog";
import {
  collectionCoverUrl,
  groupRecipesByCollection,
} from "@client/features/collections/collection-recipes";
import {
  createCollection,
  formatRecipeCount,
} from "@client/features/collections/collection-values";
import {
  collectionListSettings$,
  collectionRecipes$,
  collections$,
} from "@client/features/collections/queries";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { recipes$ } from "@client/features/recipes/queries";
import { compareNames } from "@client/features/recipes/recipe-tags";
import { formatMetaTitle } from "@client/lib/meta";
import { collectionListSettings } from "@shared/recipes";
import type { RecipeView } from "@shared/recipes";
import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useState } from "react";

export const Route = createFileRoute("/_authenticated/_app/collections/")({
  staticData: { breadcrumbs: [{ label: "Collections" }] },
  component: Collections,
});

const viewOptions = [
  { label: "List", value: "list" },
  { label: "Grid", value: "grid" },
] as const satisfies readonly { label: string; value: RecipeView }[];

function Collections() {
  const { household, user } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const store = useHouseholdStore(household.id);
  const collections = useHouseholdQuery(household.id, collections$);
  const links = useHouseholdQuery(household.id, collectionRecipes$);
  const recipes = useHouseholdQuery(household.id, recipes$);
  const { view } = useHouseholdQuery(household.id, collectionListSettings$);
  const [isCreating, setIsCreating] = useState(false);

  const recipesByCollection = groupRecipesByCollection(links, recipes);
  const sortedCollections = collections.toSorted((left, right) =>
    compareNames(left.title, right.title),
  );
  const Item = view === "grid" ? MediaGridItem : MediaListItem;

  return (
    <>
      <title>{formatMetaTitle("Collections")}</title>
      <AppHeaderActions>
        <div className="-mr-2 flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Display settings"
              className={buttonVariants({ size: "icon", variant: "ghost" })}
            >
              <Sorting03Icon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>View</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  onValueChange={(nextView: RecipeView) =>
                    store.commit(collectionListSettings.set({ view: nextView }))
                  }
                  value={view}
                >
                  {viewOptions.map((option) => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            aria-label="New collection"
            onClick={() => setIsCreating(true)}
            size="icon"
            variant="ghost"
          >
            <Add01Icon />
          </Button>
        </div>
      </AppHeaderActions>
      <div className="p-2 lg:p-3">
        {sortedCollections.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
            <p className="font-medium">No collections yet</p>
            <p className="max-w-sm text-olive-500">
              Gather recipes for an occasion, a routine, or someone in the family.
            </p>
            <Button className="mt-2" onClick={() => setIsCreating(true)} size="sm">
              New collection
            </Button>
          </div>
        ) : (
          <MediaItems view={view}>
            {sortedCollections.map((collection) => {
              const collectionRecipes = recipesByCollection.get(collection.id) ?? [];
              const count = formatRecipeCount(collectionRecipes.length);
              return (
                <Item
                  actions={
                    <CollectionActionsMenu
                      collection={collection}
                      householdId={household.id}
                      userId={user.id}
                    />
                  }
                  details={
                    view === "grid" ? (
                      <>
                        {collection.description && (
                          <span className="truncate">{collection.description}</span>
                        )}
                        <span className="text-olive-500">{count}</span>
                      </>
                    ) : (
                      [count, collection.description].filter(Boolean).map((part, index) => (
                        <Fragment key={index}>
                          {index > 0 && <span aria-hidden="true"> · </span>}
                          {part}
                        </Fragment>
                      ))
                    )
                  }
                  imageUrl={collectionCoverUrl(collectionRecipes)}
                  key={collection.id}
                  link={{
                    to: "/collections/$collectionId",
                    params: { collectionId: collection.id },
                  }}
                  title={collection.title}
                />
              );
            })}
          </MediaItems>
        )}
      </div>
      <CollectionDialog
        onOpenChange={setIsCreating}
        onSave={(values) => {
          const id = crypto.randomUUID();
          store.commit(createCollection(values, { id, createdBy: user.id, createdAt: new Date() }));
          void navigate({ to: "/collections/$collectionId", params: { collectionId: id } });
        }}
        open={isCreating}
      />
    </>
  );
}

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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIcon,
  EmptyTitle,
} from "@client/components/ui/empty";
import { Add01Icon, Layers01Icon, Sorting03Icon } from "@client/components/ui/icons";
import { CollectionActionsMenu } from "@client/features/collections/collection-actions-menu";
import { CollectionDialog } from "@client/features/collections/collection-dialog";
import {
  collectionCoverUrl,
  formatRecipeCount,
  groupRecipesByCollection,
} from "@client/features/collections/collection-recipes";
import {
  collectionListSettings$,
  collectionRecipes$,
  collections$,
} from "@client/features/collections/queries";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { recipes$ } from "@client/features/recipes/queries";
import { compareNames } from "@client/features/recipes/recipe-tags";
import { formatMetaTitle } from "@client/lib/meta";
import { collectionCreated, collectionListSettings } from "@shared/recipes";
import type { RecipeView } from "@shared/recipes";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

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
      {/* Items pad their content, so an empty box takes that padding to line up with the header. */}
      <div className={sortedCollections.length === 0 ? "p-5 lg:p-6" : "p-2 lg:p-3"}>
        {sortedCollections.length === 0 ? (
          <Empty>
            <EmptyIcon>
              <Layers01Icon />
            </EmptyIcon>
            <EmptyHeader>
              <EmptyTitle>No collections yet</EmptyTitle>
              <EmptyDescription>
                Gather recipes for an occasion, a routine, or someone in the family.
              </EmptyDescription>
            </EmptyHeader>
            <Button onClick={() => setIsCreating(true)} variant="primary">
              New collection
            </Button>
          </Empty>
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
                    view === "grid" ? <span className="text-olive-500">{count}</span> : count
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
        onSave={(title) => {
          const id = crypto.randomUUID();
          store.commit(collectionCreated({ id, title, createdBy: user.id, createdAt: new Date() }));
          void navigate({ to: "/collections/$collectionId", params: { collectionId: id } });
        }}
        open={isCreating}
      />
    </>
  );
}

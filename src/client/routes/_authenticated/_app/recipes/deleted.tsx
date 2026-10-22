import { ConfirmDialog } from "@client/components/particles/confirm-dialog";
import { MediaItems, MediaListItem } from "@client/components/particles/media-item";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyTitle,
} from "@client/components/ui/empty";
import { Delete02Icon, MoreHorizontalIcon, ServingFoodIcon } from "@client/components/ui/icons";
import { toast } from "@client/components/ui/toast";
import { useMembersById } from "@client/features/household/members";
import {
  deletedRecipeDays,
  deleteRecipePermanently,
  restoreRecipe,
  useDeletedRecipes,
} from "@client/features/recipes/recipe-data";
import type { DeletedRecipe } from "@client/features/recipes/recipe-data";
import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/_app/recipes/deleted")({
  staticData: {
    breadcrumbs: [{ label: "Recipes", link: { to: "/recipes" } }, { label: "Recently deleted" }],
  },
  component: RecentlyDeleted,
});

const relativeDays = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// "today", "yesterday", or "3 days ago", by calendar day.
function formatDeletedDay(deletedAt: Date, now = new Date()) {
  const days = Math.round(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(deletedAt).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  return relativeDays.format(-Math.max(days, 0), "day");
}

function restore(recipe: DeletedRecipe) {
  void restoreRecipe(recipe.id);
  toast.add({ title: `Restored ${recipe.title}` });
}

// Deleted recipes, most recent first, until they're restored or deleted for good. They don't
// open, as their page would be the one they were deleted from; restoring brings it back.
function RecentlyDeleted() {
  const recipes = useDeletedRecipes();
  const membersById = useMembersById();
  // Kept after the dialog closes, so its text doesn't change while it animates out.
  const [deleting, setDeleting] = useState<DeletedRecipe | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <>
      <title>{formatMetaTitle("Recently deleted")}</title>
      <div className="flex min-h-full flex-col p-2 lg:p-3">
        {recipes.length === 0 ? (
          <Empty>
            <EmptyIllustration
              height="512"
              src="/images/empty-recipes-no-results-bowl.avif"
              width="512"
            />
            <EmptyHeader>
              <EmptyTitle>No recently deleted recipes</EmptyTitle>
              <EmptyDescription>
                Deleted recipes stay here for {deletedRecipeDays} days, so you can restore them.
              </EmptyDescription>
            </EmptyHeader>
            <Link className={buttonVariants()} to="/recipes">
              Back to recipes
            </Link>
          </Empty>
        ) : (
          <>
            {/* Padded like the items, so the text lines up with their titles' edge. */}
            <p className="px-3 pt-1 pb-2 text-sm text-olive-500">
              Recipes are deleted for good {deletedRecipeDays} days after they’re deleted.
            </p>
            <MediaItems view="list">
              {recipes.map((recipe) => {
                const deletedBy = membersById?.get(recipe.deletedBy)?.name;
                return (
                  <MediaListItem
                    actions={
                      <div className="flex items-center gap-1">
                        <Button onClick={() => restore(recipe)}>Restore</Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label={`More actions for ${recipe.title}`}
                            className={buttonVariants({ size: "icon-sm", variant: "ghost" })}
                          >
                            <MoreHorizontalIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-52">
                            <DropdownMenuItem
                              onClick={() => {
                                setDeleting(recipe);
                                setIsConfirmingDelete(true);
                              }}
                              variant="destructive"
                            >
                              <Delete02Icon />
                              Delete now…
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    }
                    details={`Deleted ${formatDeletedDay(recipe.deletedAt)}${deletedBy ? ` by ${deletedBy}` : ""}`}
                    imageUrl={recipe.imageUrl}
                    key={recipe.id}
                    placeholderIcon={<ServingFoodIcon />}
                    title={recipe.title}
                  />
                );
              })}
            </MediaItems>
          </>
        )}
      </div>
      <ConfirmDialog
        action="Delete"
        description="It will be deleted for good, with its photo. This can’t be undone."
        onConfirm={() => {
          if (deleting) void deleteRecipePermanently(deleting.id);
        }}
        onOpenChange={setIsConfirmingDelete}
        open={isConfirmingDelete}
        title={`Delete ${deleting?.title ?? "recipe"} now?`}
      />
    </>
  );
}

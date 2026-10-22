import { NotFoundState } from "@client/components/particles/not-found-state";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyTitle,
} from "@client/components/ui/empty";
import { restoreRecipe, useDeletedRecipes } from "@client/features/recipes/recipe-data";
import { formatMetaTitle } from "@client/lib/meta";
import { Link } from "@tanstack/react-router";

// A wrong link, or a recipe deleted while open, perhaps on another device. One in Recently deleted
// says so, and can come back right here.
export function RecipeNotFound({ recipeId }: { recipeId: string }) {
  const deleted = useDeletedRecipes().find((recipe) => recipe.id === recipeId);
  if (!deleted) {
    return (
      <NotFoundState
        description="It may have been deleted, or the link to it is wrong."
        linkLabel="Back to recipes"
        title="Recipe not found"
      />
    );
  }
  return (
    <Empty className="min-h-full">
      <title>{formatMetaTitle(deleted.title)}</title>
      <EmptyIllustration
        height="512"
        src="/images/empty-recipes-no-results-bowl.avif"
        width="512"
      />
      <EmptyHeader>
        <EmptyTitle>{deleted.title} was deleted</EmptyTitle>
        <EmptyDescription>It’s in Recently deleted, so you can still restore it.</EmptyDescription>
      </EmptyHeader>
      <div className="flex gap-2">
        <Link className={buttonVariants()} to="/recipes/deleted">
          Recently deleted
        </Link>
        <Button onClick={() => void restoreRecipe(deleted.id)} variant="primary">
          Restore
        </Button>
      </div>
    </Empty>
  );
}

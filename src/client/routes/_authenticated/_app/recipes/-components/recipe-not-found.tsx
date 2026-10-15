import { NotFoundState } from "@client/components/particles/not-found-state";

// A wrong link, or a recipe deleted while open, perhaps on another device.
export function RecipeNotFound() {
  return (
    <NotFoundState
      description="It may have been deleted, or the link to it is wrong."
      linkLabel="Back to recipes"
      title="Recipe not found"
    />
  );
}

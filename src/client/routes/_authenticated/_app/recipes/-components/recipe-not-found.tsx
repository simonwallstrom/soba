import { formatMetaTitle } from "@client/lib/meta";
import { Link } from "@tanstack/react-router";

export function RecipeNotFound() {
  return (
    <div className="flex flex-col items-start gap-2 p-5 lg:p-6">
      <title>{formatMetaTitle("Recipe not found")}</title>
      <h1 className="text-xl font-medium">Recipe not found</h1>
      <p>It may have been deleted, or the link is wrong.</p>
      <Link className="underline" to="/recipes">
        Back to recipes
      </Link>
    </div>
  );
}

import { buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import {
  Calendar03Icon,
  Cancel01Icon,
  FileEditIcon,
  MoreHorizontalIcon,
  StarIcon,
} from "@client/components/ui/icons";
import { Link } from "@tanstack/react-router";

// Meal plans and deleting arrive later.
export function RecipeActionsMenu({
  className,
  isFavorite,
  onToggleFavorite,
  recipeId,
  recipeTitle,
  size = "icon-sm",
}: {
  className?: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  recipeId: string;
  recipeTitle: string;
  size?: "icon" | "icon-sm";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`More actions for ${recipeTitle}`}
        className={buttonVariants({ className, size, variant: "ghost" })}
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link params={{ recipeId }} to="/recipes/$recipeId/edit" />}>
            <FileEditIcon />
            Edit recipe
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Calendar03Icon />
            Add to meal plan…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleFavorite}>
            <StarIcon />
            {isFavorite ? "Remove from favorites" : "Add to favorites"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Cancel01Icon />
          Delete recipe
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

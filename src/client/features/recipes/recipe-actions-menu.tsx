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
  Bookmark02Icon,
  Calendar03Icon,
  Cancel01Icon,
  FileEditIcon,
  MoreHorizontalIcon,
} from "@client/components/ui/icons";
import type { ReactNode } from "react";

// Editing, meal plans, and deleting arrive later. `children` adds menu items for where the
// recipe is shown, like removing it from a collection.
export function RecipeActionsMenu({
  children,
  className,
  onAddToCollection,
  recipeTitle,
  size = "icon-sm",
}: {
  children?: ReactNode;
  className?: string;
  onAddToCollection: () => void;
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
          <DropdownMenuItem>
            <FileEditIcon />
            Edit recipe
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Calendar03Icon />
            Add to meal plan…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddToCollection}>
            <Bookmark02Icon />
            Add to collection…
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {children && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>{children}</DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Cancel01Icon />
          Delete recipe
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

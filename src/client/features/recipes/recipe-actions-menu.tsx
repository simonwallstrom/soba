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

// A prototype: editing, meal plans, and deleting arrive later. `children` adds menu items
// for where the recipe is shown, like removing it from a collection.
export function RecipeActionsMenu({
  children,
  className,
  recipeTitle,
}: {
  children?: ReactNode;
  className?: string;
  recipeTitle: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`More actions for ${recipeTitle}`}
        className={buttonVariants({ className, size: "icon-sm", variant: "ghost" })}
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
          <DropdownMenuItem>
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

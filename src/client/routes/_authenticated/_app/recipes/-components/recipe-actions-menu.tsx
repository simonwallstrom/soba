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

// A prototype: the actions arrive with recipe editing, meal plans, and collections.
export function RecipeActionsMenu({
  className,
  recipeTitle,
}: {
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
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Cancel01Icon />
          Delete recipe
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@client/components/ui/alert-dialog";
import { Button, buttonVariants } from "@client/components/ui/button";
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
  Share08Icon,
  StarIcon,
} from "@client/components/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@client/components/ui/tooltip";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";

// Deleting asks first, as the recipe disappears for the whole household. The route opens its
// own meal plan dialog, so recipes don't depend on meal planning. The list and the recipe page
// share this menu, so its order is the same in both.
export function RecipeActionsMenu({
  className,
  isFavorite,
  onAddToMealPlan,
  onDelete,
  onShare,
  onToggleFavorite,
  recipeId,
  recipeTitle,
  size = "icon-sm",
  tooltip,
}: {
  className?: string;
  isFavorite: boolean;
  onAddToMealPlan: () => void;
  onDelete: () => void;
  onShare: () => void;
  onToggleFavorite: () => void;
  recipeId: string;
  recipeTitle: string;
  size?: "icon" | "icon-sm";
  // Shown where the menu sits among other labeled icons, like the recipe's header, but not on
  // every row of a list.
  tooltip?: string;
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <DropdownMenu>
        <Tooltip disabled={!tooltip}>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                aria-label={`More actions for ${recipeTitle}`}
                className={buttonVariants({ className, size, variant: "ghost" })}
              />
            }
          >
            <MoreHorizontalIcon />
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link params={{ recipeId }} to="/recipes/$recipeId/edit" />}>
              <FileEditIcon />
              Edit recipe
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddToMealPlan}>
              <Calendar03Icon />
              Add to meal plan…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Share08Icon />
              Share recipe…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFavorite}>
              <StarIcon />
              {isFavorite ? "Remove from favorites" : "Add to favorites"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsConfirmingDelete(true)} variant="destructive">
            <Cancel01Icon />
            Delete recipe…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog onOpenChange={setIsConfirmingDelete} open={isConfirmingDelete}>
        <AlertDialogContent initialFocus={cancelRef}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {recipeTitle}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed for everyone in your household.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              onClick={() => {
                setIsConfirmingDelete(false);
                onDelete();
              }}
              variant="destructive"
            >
              Delete
            </Button>
            {/* Cancel is the safe choice, so it takes focus and Enter. */}
            <Button onClick={() => setIsConfirmingDelete(false)} ref={cancelRef}>
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

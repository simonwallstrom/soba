import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
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
import { useRef, useState } from "react";

// Meal plans arrive later. Deleting asks first, as the recipe disappears for the whole household.
export function RecipeActionsMenu({
  className,
  isFavorite,
  onDelete,
  onToggleFavorite,
  recipeId,
  recipeTitle,
  size = "icon-sm",
}: {
  className?: string;
  isFavorite: boolean;
  onDelete: () => void;
  onToggleFavorite: () => void;
  recipeId: string;
  recipeTitle: string;
  size?: "icon" | "icon-sm";
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <>
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
          <DropdownMenuItem onClick={() => setIsConfirmingDelete(true)} variant="destructive">
            <Cancel01Icon />
            Delete recipe…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog onOpenChange={setIsConfirmingDelete} open={isConfirmingDelete}>
        <DialogContent initialFocus={cancelRef} showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete {recipeTitle}?</DialogTitle>
            <DialogDescription>
              It will be removed for everyone in your household.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
            <Button onClick={() => setIsConfirmingDelete(false)} ref={cancelRef} variant="primary">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

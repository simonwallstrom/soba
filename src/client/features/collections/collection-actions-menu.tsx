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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { Cancel01Icon, FileEditIcon, MoreHorizontalIcon } from "@client/components/ui/icons";
import { CollectionDialog } from "@client/features/collections/collection-dialog";
import { useHouseholdStore } from "@client/features/household/store";
import { collectionDeleted, collectionUpdated } from "@shared/recipes";
import type { Collection } from "@shared/recipes";
import { useRef, useState } from "react";

// Renaming and deleting a collection, as anyone in the household.
export function CollectionActionsMenu({
  collection,
  householdId,
  onDeleted,
  size = "icon-sm",
  userId,
}: {
  collection: Collection;
  householdId: string;
  onDeleted?: () => void;
  size?: "icon" | "icon-sm";
  userId: string;
}) {
  const store = useHouseholdStore(householdId);
  const [openDialog, setOpenDialog] = useState<"rename" | "delete" | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);

  function closeDialog(open: boolean) {
    if (!open) setOpenDialog(null);
  }

  function remove() {
    store.commit(
      collectionDeleted({ id: collection.id, deletedBy: userId, deletedAt: new Date() }),
    );
    setOpenDialog(null);
    onDeleted?.();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`More actions for ${collection.title}`}
          className={buttonVariants({ size, variant: "ghost" })}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setOpenDialog("rename")}>
            <FileEditIcon />
            Rename collection…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenDialog("delete")} variant="destructive">
            <Cancel01Icon />
            Delete collection…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CollectionDialog
        onOpenChange={closeDialog}
        onSave={(title) => {
          if (title === collection.title) return;
          store.commit(
            collectionUpdated({
              id: collection.id,
              title,
              updatedBy: userId,
              updatedAt: new Date(),
            }),
          );
        }}
        open={openDialog === "rename"}
        title={collection.title}
      />
      <Dialog onOpenChange={closeDialog} open={openDialog === "delete"}>
        {/* Cancel takes focus, so pressing Enter by habit never deletes. */}
        <DialogContent initialFocus={cancelDeleteRef} showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete “{collection.title}”?</DialogTitle>
            <DialogDescription>
              It is removed for everyone in your household. Its recipes stay in your recipe list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={remove} variant="destructive">
              Delete collection
            </Button>
            <Button onClick={() => setOpenDialog(null)} ref={cancelDeleteRef}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

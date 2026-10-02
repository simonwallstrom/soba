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
import { changedCollectionValues } from "@client/features/collections/collection-values";
import { useHouseholdStore } from "@client/features/household/store";
import { collectionDeleted, collectionUpdated } from "@shared/recipes";
import type { Collection } from "@shared/recipes";
import { useState } from "react";

// Editing and deleting a collection, as anyone in the household.
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
  const [openDialog, setOpenDialog] = useState<"edit" | "delete" | null>(null);

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
          <DropdownMenuItem onClick={() => setOpenDialog("edit")}>
            <FileEditIcon />
            Edit collection…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenDialog("delete")} variant="destructive">
            <Cancel01Icon />
            Delete collection…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CollectionDialog
        collection={collection}
        onOpenChange={closeDialog}
        onSave={(values) => {
          const changes = changedCollectionValues(collection, values);
          if (!changes) return;
          store.commit(
            collectionUpdated({
              id: collection.id,
              ...changes,
              updatedBy: userId,
              updatedAt: new Date(),
            }),
          );
        }}
        open={openDialog === "edit"}
      />
      <Dialog onOpenChange={closeDialog} open={openDialog === "delete"}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete “{collection.title}”?</DialogTitle>
            <DialogDescription>
              It is removed for everyone in your household. Its recipes stay in your recipe list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {/* Keeping is the safe choice, so it takes focus and Enter. */}
            <Button onClick={() => setOpenDialog(null)} variant="primary">
              Keep collection
            </Button>
            <Button onClick={remove}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { Button } from "@client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { useRef } from "react";

// Asks before an action that can't be undone. Cancel is the safe choice, so it takes focus.
export function ConfirmDialog({
  action,
  description,
  onConfirm,
  onOpenChange,
  open,
  title,
}: {
  action: string;
  description: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent initialFocus={cancelRef} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
            variant="destructive"
          >
            {action}
          </Button>
          <Button onClick={() => onOpenChange(false)} ref={cancelRef} variant="primary">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { DialogHeader, DialogPopup } from "@client/components/ui/dialog";
import { cn } from "cn";
import type { ComponentProps } from "react";

export { DialogDescription as AlertDialogDescription } from "@client/components/ui/dialog";
export { DialogFooter as AlertDialogFooter } from "@client/components/ui/dialog";
export { DialogTitle as AlertDialogTitle } from "@client/components/ui/dialog";

// Asks before something that can't be undone, like deleting. Unlike a dialog, it has no close
// button and stays open on a click outside, so it's answered with one of its buttons or Escape.
// Phones show it centered too, rather than as a drawer a swipe could dismiss.
export function AlertDialog(props: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root {...props} />;
}

// Narrower than a dialog, as it holds only a question and its answers.
export function AlertDialogContent({ className, ...props }: ComponentProps<typeof DialogPopup>) {
  return <DialogPopup className={cn("max-w-md", className)} {...props} />;
}

// Without the room a dialog's header leaves for its close button.
export function AlertDialogHeader({ className, ...props }: ComponentProps<typeof DialogHeader>) {
  return <DialogHeader className={cn("pr-0", className)} {...props} />;
}

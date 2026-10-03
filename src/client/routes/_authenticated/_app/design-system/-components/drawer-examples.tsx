import { buttonVariants } from "@client/components/ui/button";
import {
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from "@client/components/ui/drawer";
import { Field, FieldLabel } from "@client/components/ui/field";
import { Input } from "@client/components/ui/input";

const pantry = [
  "Olive oil",
  "Crushed tomatoes",
  "Tomato paste",
  "Garlic",
  "Yellow onions",
  "Basil",
  "Parmesan",
  "Spaghetti",
  "Arborio rice",
  "Vegetable stock",
  "Butter",
  "Lemons",
  "Dill",
  "Salmon",
  "Halloumi",
  "Crème fraîche",
  "Chili flakes",
  "Black pepper",
];

// Drawers render the same on every screen size; Dialog switches to one below `sm`.
export function DrawerExamples() {
  return (
    <div className="flex flex-wrap gap-2">
      <Drawer>
        <DrawerTrigger className={buttonVariants()}>Open drawer</DrawerTrigger>
        <DrawerContent>
          <DialogHeader>
            <DialogTitle>Weeknight dinners</DialogTitle>
            <DialogDescription>
              Close it with the button, a swipe down, a tap outside, or Escape.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DrawerClose className={buttonVariants({ variant: "primary" })}>Done</DrawerClose>
          </DialogFooter>
        </DrawerContent>
      </Drawer>
      <Drawer>
        <DrawerTrigger className={buttonVariants()}>With a text field</DrawerTrigger>
        <DrawerContent>
          <DialogHeader>
            <DialogTitle>Rename tag</DialogTitle>
            <DialogDescription>The drawer stays above the on-screen keyboard.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="drawer-title">Title</FieldLabel>
            <Input defaultValue="Weeknight" id="drawer-title" />
          </Field>
          <DialogFooter>
            <DrawerClose className={buttonVariants({ variant: "primary" })}>Save</DrawerClose>
            <DrawerClose className={buttonVariants()}>Cancel</DrawerClose>
          </DialogFooter>
        </DrawerContent>
      </Drawer>
      <Drawer>
        <DrawerTrigger className={buttonVariants()}>Scrollable drawer</DrawerTrigger>
        <DrawerContent>
          <DialogHeader>
            <DialogTitle>Pantry</DialogTitle>
            <DialogDescription>The list scrolls; drag the header to dismiss.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ul className="flex flex-col gap-4">
              {pantry.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </DialogBody>
          <DialogFooter>
            <DrawerClose className={buttonVariants({ variant: "primary" })}>Done</DrawerClose>
          </DialogFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

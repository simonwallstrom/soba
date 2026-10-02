import { buttonVariants } from "@client/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@client/components/ui/dialog";
import { Field, FieldLabel } from "@client/components/ui/field";
import { Input } from "@client/components/ui/input";
import { useRef } from "react";

const sauceSteps = [
  "Warm olive oil in a heavy pot over medium heat until it shimmers.",
  "Add finely chopped onion and cook slowly until soft and translucent.",
  "Stir in minced garlic and cook just until fragrant.",
  "Add tomato paste and let it darken slightly on the bottom of the pot.",
  "Pour in crushed tomatoes and stir to release the browned bits.",
  "Add a pinch of salt and a small sprig of fresh basil.",
  "Bring the sauce to a gentle simmer, then reduce the heat.",
  "Leave the lid slightly ajar so steam can escape.",
  "Stir occasionally, scraping the bottom so nothing catches.",
  "Add a splash of water if the sauce thickens too quickly.",
  "After thirty minutes, taste and adjust the salt.",
  "Continue simmering until the tomatoes taste sweet and mellow.",
  "Remove the basil and blend briefly if you prefer a smooth sauce.",
  "Stir in a little butter for a richer finish.",
  "Toss with cooked pasta and a spoonful of its cooking water.",
  "Serve with grated cheese and fresh basil.",
];

export function DialogExamples() {
  // Focuses the dialog itself so opening it does not scroll the list.
  const scrollableRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog>
        <DialogTrigger className={buttonVariants()}>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import a recipe</DialogTitle>
            <DialogDescription>Paste a recipe URL to add it to your household.</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="dialog-url">Recipe URL</FieldLabel>
            <Input id="dialog-url" placeholder="https://" type="url" />
          </Field>
          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "primary" })}>Import</DialogClose>
            <DialogClose className={buttonVariants()}>Cancel</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog>
        <DialogTrigger className={buttonVariants()}>Scrollable dialog</DialogTrigger>
        <DialogContent
          className="max-h-96 sm:max-h-96"
          initialFocus={scrollableRef}
          ref={scrollableRef}
        >
          <DialogHeader>
            <DialogTitle>Slow-cooked tomato sauce</DialogTitle>
            <DialogDescription>
              A longer recipe to show how dialog content scrolls.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ol className="flex list-decimal flex-col gap-4 pl-5">
              {sauceSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </DialogBody>
          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "primary" })}>Done</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog>
        <DialogTrigger className={buttonVariants()}>Nested dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add tags</DialogTitle>
            <DialogDescription>Pasta carbonara</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "primary" })}>Done</DialogClose>
            {/* Nested inside the popup, so it stacks above this dialog. */}
            <Dialog>
              <DialogTrigger className={buttonVariants()}>New tag…</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New tag</DialogTitle>
                </DialogHeader>
                <Field>
                  <FieldLabel htmlFor="nested-dialog-title">Title</FieldLabel>
                  <Input id="nested-dialog-title" placeholder="Weeknight" />
                </Field>
                <DialogFooter>
                  <DialogClose className={buttonVariants({ variant: "primary" })}>
                    Create
                  </DialogClose>
                  <DialogClose className={buttonVariants()}>Cancel</DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

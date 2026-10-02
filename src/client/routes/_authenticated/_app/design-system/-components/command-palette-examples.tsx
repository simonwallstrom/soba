import {
  CommandPaletteContent,
  CommandPaletteContext,
  CommandPaletteFooter,
  CommandPaletteHint,
  CommandPaletteInput,
  CommandPaletteList,
} from "@client/components/particles/command-palette";
import { Button } from "@client/components/ui/button";
import { Combobox, ComboboxCheckboxItem, ComboboxEmpty } from "@client/components/ui/combobox";
import { Dialog, DialogClose, DialogTrigger } from "@client/components/ui/dialog";
import { Add01Icon, ServingFoodIcon } from "@client/components/ui/icons";
import { ImagePlaceholder } from "@client/components/ui/image-thumbnail";
import { useState } from "react";

const recipes = [
  "Chili con carne",
  "Citronkyckling med rostad potatis",
  "Enkelt surdegsbröd",
  "Fiskgratäng med potatismos",
  "Halloumistroganoff",
  "Korv stroganoff",
  "Krämig svamprisotto",
  "Krämig tomatsoppa",
  "Mormors kanelbullar",
  "Pannkakor",
  "Pasta carbonara",
  "Raggmunk med fläsk",
  "Tacos med rostad majs",
  "Ugnsbakad lax med dill",
  "Äppelpaj med havrecrunch",
];

export function CommandPaletteExample() {
  const [added, setAdded] = useState(["Pasta carbonara", "Pannkakor", "Halloumistroganoff"]);

  return (
    <div className="flex flex-col items-start gap-3">
      <Dialog>
        <DialogTrigger render={<Button />}>
          <Add01Icon />
          Add recipes
        </DialogTrigger>
        <CommandPaletteContent aria-label="Add recipes to Weeknight">
          <RecipePicker added={added} onAddedChange={setAdded} />
        </CommandPaletteContent>
      </Dialog>
      <p className="text-sm text-olive-500">
        {added.length} recipes tagged Weeknight: {added.join(", ")}
      </p>
    </div>
  );
}

// Mounts with the popup, so recipes already added move to the top on open and stay put while
// you pick.
function RecipePicker({
  added,
  onAddedChange,
}: {
  added: string[];
  onAddedChange: (added: string[]) => void;
}) {
  const [pinned] = useState(() => new Set(added));
  const items = [
    ...recipes.filter((title) => pinned.has(title)),
    ...recipes.filter((title) => !pinned.has(title)),
  ];

  return (
    <Combobox
      autoHighlight
      inline
      items={items}
      multiple
      onValueChange={onAddedChange}
      open
      value={added}
    >
      <CommandPaletteContext label="Tag">Weeknight</CommandPaletteContext>
      <CommandPaletteInput placeholder="Find recipes…" />
      <ComboboxEmpty>No recipes found.</ComboboxEmpty>
      <CommandPaletteList>
        {(title: string) => (
          <ComboboxCheckboxItem key={title} value={title}>
            <span className="flex min-w-0 items-center gap-3">
              <ImagePlaceholder className="h-8 w-9 shrink-0 rounded-md [&_svg]:size-4">
                <ServingFoodIcon />
              </ImagePlaceholder>
              <span className="truncate">{title}</span>
            </span>
          </ComboboxCheckboxItem>
        )}
      </CommandPaletteList>
      <CommandPaletteFooter>
        <CommandPaletteHint keys={["↵"]}>Add or remove</CommandPaletteHint>
        <DialogClose render={<Button size="sm" variant="ghost" />}>
          <CommandPaletteHint keys={["esc"]}>Done</CommandPaletteHint>
        </DialogClose>
      </CommandPaletteFooter>
    </Combobox>
  );
}

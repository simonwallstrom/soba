import {
  Combobox,
  ComboboxButton,
  ComboboxCheckboxItem,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@client/components/ui/combobox";
import { Field, FieldDescription, FieldLabel } from "@client/components/ui/field";
import { useState } from "react";

const cuisines = ["Italian", "Nordic", "Mexican", "French", "Thai"];
const initialIngredients = ["Tomato", "Garlic", "Onion", "Potato", "Rice"];

export function SingleComboboxExample() {
  return (
    <Field>
      <FieldLabel htmlFor="combobox-cuisine">Cuisine</FieldLabel>
      <Combobox items={cuisines}>
        <ComboboxInput id="combobox-cuisine" placeholder="Choose a cuisine…" showClear />
        <ComboboxContent>
          <ComboboxEmpty>No cuisines found.</ComboboxEmpty>
          <ComboboxList>
            {(cuisine: string) => (
              <ComboboxItem key={cuisine} value={cuisine}>
                {cuisine}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldDescription>Type to filter, or open the list with the arrow.</FieldDescription>
    </Field>
  );
}

export function CompactComboboxExample() {
  const [selected, setSelected] = useState(["Italian", "Nordic", "Mexican"]);
  const summary =
    selected.length > 1
      ? `${selected[0]} +${selected.length - 1}`
      : (selected[0] ?? "All cuisines");

  return (
    <Field>
      <FieldLabel id="combobox-filter-label">Filter cuisines</FieldLabel>
      <Combobox items={cuisines} multiple onValueChange={setSelected} value={selected}>
        <ComboboxButton aria-labelledby="combobox-filter-label">
          <ComboboxValue placeholder="All cuisines">{summary}</ComboboxValue>
        </ComboboxButton>
        <ComboboxContent>
          <ComboboxInput placeholder="Search cuisines…" showTrigger={false} variant="popup" />
          <ComboboxEmpty>No cuisines found.</ComboboxEmpty>
          <ComboboxList>
            {(cuisine: string) => (
              <ComboboxCheckboxItem key={cuisine} value={cuisine}>
                {cuisine}
              </ComboboxCheckboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldDescription>Compact multiple selection for filter controls.</FieldDescription>
    </Field>
  );
}

export function CreatableComboboxExample() {
  const anchor = useComboboxAnchor();
  const [available, setAvailable] = useState(initialIngredients);
  const [inputValue, setInputValue] = useState("");
  const [selected, setSelected] = useState(["Tomato"]);
  const candidate = inputValue.trim();
  const exists = available.some((item) => item.toLowerCase() === candidate.toLowerCase());
  const created = candidate && !exists ? candidate : null;
  const items = created ? [...available, created] : available;

  function changeValue(value: string[]) {
    setSelected(value);
    if (created && value.includes(created)) {
      setAvailable((current) => [...current, created]);
      setInputValue("");
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor="combobox-ingredients">Ingredients</FieldLabel>
      <Combobox
        inputValue={inputValue}
        items={items}
        multiple
        onInputValueChange={setInputValue}
        onValueChange={changeValue}
        value={selected}
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {selected.map((ingredient) => (
              <ComboboxChip key={ingredient}>{ingredient}</ComboboxChip>
            ))}
          </ComboboxValue>
          <ComboboxChipsInput
            id="combobox-ingredients"
            placeholder="Find or create an ingredient…"
          />
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxList>
            {(ingredient: string) => (
              <ComboboxCheckboxItem key={ingredient} value={ingredient}>
                {ingredient === created ? `Create “${ingredient}”` : ingredient}
              </ComboboxCheckboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldDescription>
        Select several ingredients, or type a new one to create it.
      </FieldDescription>
    </Field>
  );
}

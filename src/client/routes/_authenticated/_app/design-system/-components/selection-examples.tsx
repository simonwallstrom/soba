import { Checkbox } from "@client/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@client/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@client/components/ui/radio-group";
import { Toggle } from "@client/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@client/components/ui/toggle-group";

export function CheckboxExamples() {
  const states = [
    { id: "unchecked", label: "Unchecked", props: {} },
    { id: "checked", label: "Checked", props: { defaultChecked: true } },
    { id: "indeterminate", label: "Indeterminate", props: { indeterminate: true } },
    { id: "disabled", label: "Disabled", props: { disabled: true } },
    { id: "invalid", label: "Invalid", props: { "aria-invalid": true } },
  ] as const;

  return (
    <FieldGroup className="max-w-sm">
      {states.map((state) => (
        <Field
          data-disabled={state.id === "disabled" || undefined}
          key={state.id}
          orientation="horizontal"
        >
          <Checkbox id={`checkbox-${state.id}`} {...state.props} />
          <FieldLabel htmlFor={`checkbox-${state.id}`}>{state.label}</FieldLabel>
        </Field>
      ))}
    </FieldGroup>
  );
}

export function RadioGroupExample() {
  const options = [
    { value: "name", label: "Name (A–Z)" },
    { value: "created", label: "Recently created" },
    { value: "updated", label: "Recently updated" },
  ];

  return (
    <FieldSet className="max-w-sm">
      <FieldLegend>Sort recipes by</FieldLegend>
      <RadioGroup defaultValue="name" name="sort">
        {options.map((option) => (
          <Field key={option.value} orientation="horizontal">
            <RadioGroupItem id={`sort-${option.value}`} value={option.value} />
            <FieldLabel htmlFor={`sort-${option.value}`}>{option.label}</FieldLabel>
          </Field>
        ))}
      </RadioGroup>
    </FieldSet>
  );
}

export function ToggleExamples() {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-1">
        <Toggle>Outline</Toggle>
        <Toggle variant="ghost">Ghost</Toggle>
        <Toggle size="sm">Small</Toggle>
        <Toggle size="sm" variant="ghost">
          Small
        </Toggle>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Toggle defaultPressed>Pressed</Toggle>
        <Toggle disabled>Disabled</Toggle>
      </div>
    </div>
  );
}

export function ToggleGroupExamples() {
  return (
    <div className="grid gap-4">
      <ToggleGroup aria-label="Recipe layout" defaultValue={["grid"]}>
        <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="table">Table</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup aria-label="Recipe layout, joined" defaultValue={["grid"]} spacing={0}>
        <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
        <ToggleGroupItem value="list">List</ToggleGroupItem>
        <ToggleGroupItem value="table">Table</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup aria-label="Recipe density" defaultValue={["comfortable"]} variant="ghost">
        <ToggleGroupItem value="compact">Compact</ToggleGroupItem>
        <ToggleGroupItem value="comfortable">Comfortable</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

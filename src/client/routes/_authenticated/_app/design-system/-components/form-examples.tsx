import { buttonVariants } from "@client/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@client/components/ui/field";
import { Input } from "@client/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@client/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@client/components/ui/tabs";
import { Textarea } from "@client/components/ui/textarea";

const sortOptions = [
  { label: "Name", value: "name" },
  { label: "Date created", value: "created" },
  { label: "Date updated", value: "updated" },
];

export function InputExamples() {
  return (
    <div className="grid max-w-sm gap-4">
      <Input aria-label="Recipe title" placeholder="Recipe title" />
      <Input aria-label="Filled input" defaultValue="Pasta carbonara" />
      <Input aria-invalid aria-label="Invalid input" defaultValue="Invalid value" />
      <Input aria-label="Disabled input" disabled placeholder="Disabled" />
      <Input aria-label="Recipe image" type="file" />
    </div>
  );
}

export function TextareaExamples() {
  return (
    <div className="grid max-w-sm gap-4">
      <Textarea aria-label="Recipe description" placeholder="Describe this recipe…" />
      <Textarea
        aria-label="Filled description"
        defaultValue="A simple weeknight pasta with lemon, garlic, and plenty of parmesan."
      />
      <Textarea aria-invalid aria-label="Invalid description" defaultValue="Invalid value" />
      <Textarea aria-label="Disabled description" disabled placeholder="Disabled" />
    </div>
  );
}

export function FieldExamples() {
  return (
    <FieldGroup className="max-w-sm">
      <Field>
        <FieldLabel htmlFor="field-title">Recipe title</FieldLabel>
        <Input id="field-title" placeholder="Pasta carbonara" />
        <FieldDescription>The name shown throughout your recipe collection.</FieldDescription>
      </Field>
      <Field data-invalid>
        <FieldLabel htmlFor="field-invalid">Required field</FieldLabel>
        <Input aria-invalid id="field-invalid" />
        <FieldError errors={[{ message: "Recipe title is required." }]} />
      </Field>
      <Field data-disabled>
        <FieldLabel htmlFor="field-disabled">Disabled field</FieldLabel>
        <Input disabled id="field-disabled" placeholder="Unavailable" />
        <FieldDescription>This field cannot currently be edited.</FieldDescription>
      </Field>
    </FieldGroup>
  );
}

export function PopoverExample() {
  return (
    <Popover>
      <PopoverTrigger className={buttonVariants()}>Open popover</PopoverTrigger>
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>Display settings</PopoverTitle>
          <PopoverDescription>Choose how recipes appear in your collection.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  );
}

export function SelectExamples() {
  return (
    <div className="grid max-w-sm gap-4">
      <Select items={sortOptions}>
        <SelectTrigger aria-label="Sort recipes">
          <SelectValue placeholder="Sort recipes" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Sort by</SelectLabel>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select defaultValue="updated" items={sortOptions}>
        <SelectTrigger aria-label="Selected sort order" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Name</SelectItem>
          <SelectSeparator />
          <SelectItem value="created">Date created</SelectItem>
          <SelectItem value="updated">Date updated</SelectItem>
        </SelectContent>
      </Select>
      <Select disabled items={sortOptions}>
        <SelectTrigger aria-label="Disabled select">
          <SelectValue placeholder="Disabled" />
        </SelectTrigger>
      </Select>
    </div>
  );
}

export function TabsExample() {
  return (
    <Tabs className="flex max-w-md flex-col gap-5" defaultValue="ingredients">
      <TabsList className="w-full">
        <TabsTrigger className="flex-1" value="ingredients">
          Ingredients
        </TabsTrigger>
        <TabsTrigger className="flex-1" value="instructions">
          Instructions
        </TabsTrigger>
        <TabsTrigger className="flex-1" disabled value="notes">
          Notes
        </TabsTrigger>
      </TabsList>
      <TabsContent value="ingredients">Flour, water, salt, and sourdough starter.</TabsContent>
      <TabsContent value="instructions">Mix the dough, fold it, and leave it to rise.</TabsContent>
    </Tabs>
  );
}

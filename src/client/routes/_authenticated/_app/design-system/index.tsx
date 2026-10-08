import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@client/components/ui/avatar";
import { Badge } from "@client/components/ui/badge";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyIllustration,
  EmptyTitle,
} from "@client/components/ui/empty";
import * as Icons from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { ScrollArea } from "@client/components/ui/scroll-area";
import { formatMetaTitle } from "@client/lib/meta";
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import {
  CompactComboboxExample,
  CreatableComboboxExample,
  SingleComboboxExample,
} from "./-components/combobox-examples";
import { CommandPaletteExample } from "./-components/command-palette-examples";
import { DialogExamples } from "./-components/dialog-examples";
import { DrawerExamples } from "./-components/drawer-examples";
import {
  FieldExamples,
  InputExamples,
  PopoverExample,
  SelectExamples,
  TabsExample,
  TextareaExamples,
} from "./-components/form-examples";
import {
  CheckboxExamples,
  RadioGroupExample,
  ToggleExamples,
  ToggleGroupExamples,
} from "./-components/selection-examples";

export const Route = createFileRoute("/_authenticated/_app/design-system/")({
  staticData: {
    breadcrumbs: [{ label: "Settings", link: { to: "/settings" } }, { label: "Design system" }],
  },
  component: DesignSystem,
});

// Literal class names so Tailwind generates each swatch.
const oliveSwatches = [
  { step: "50", className: "bg-olive-50" },
  { step: "100", className: "bg-olive-100" },
  { step: "200", className: "bg-olive-200" },
  { step: "300", className: "bg-olive-300" },
  { step: "400", className: "bg-olive-400" },
  { step: "500", className: "bg-olive-500" },
  { step: "600", className: "bg-olive-600" },
  { step: "700", className: "bg-olive-700" },
  { step: "800", className: "bg-olive-800" },
  { step: "900", className: "bg-olive-900" },
  { step: "925", className: "bg-olive-925" },
  { step: "950", className: "bg-olive-950" },
];

const typeScale = [
  { label: "Heading 1", className: "text-3xl font-medium", details: "text-3xl · 30px · 500" },
  { label: "Heading 2", className: "text-xl font-medium", details: "text-xl · 20px · 500" },
  { label: "Heading 3", className: "font-medium", details: "text-base · 15px · 500" },
  { label: "Body", className: "", details: "text-base · 15px · 400" },
  { label: "Small", className: "text-sm", details: "text-sm · 13px · 400" },
];

const avatarSizes = ["sm", "default", "lg"] as const;

const scrollItems = [
  "Pasta carbonara",
  "Raggmunk med fläsk",
  "Pannkakor",
  "Krämig svamprisotto",
  "Ugnsbakad lax med dill",
  "Tacos med rostad majs",
  "Halloumistroganoff",
  "Chili con carne",
];

function DesignSystem() {
  const icons = Object.entries(Icons)
    .filter(([name]) => name.endsWith("Icon"))
    .toSorted(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <title>{formatMetaTitle("Design system")}</title>
      <div className="mx-auto flex max-w-3xl flex-col gap-20 px-5 py-8 lg:px-6 lg:py-12">
        <div className="mt-12">
          <h1 className="text-3xl font-medium">Design system</h1>
          <p className="mt-2 text-balance text-olive-500">
            The source of truth for colors, typography, icons, and UI components.
          </p>
        </div>

        <Section title="Colors">
          <div className="grid grid-cols-6 gap-4 sm:grid-cols-6">
            {oliveSwatches.map((swatch) => (
              <div className="flex flex-col gap-1.5" key={swatch.step}>
                <div
                  className={`aspect-square rounded-lg ring-[0.5px] ring-black/10 ring-inset dark:ring-white/10 ${swatch.className}`}
                />
                <span className="font-mono text-xs text-olive-500">{swatch.step}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <div className="flex flex-col gap-8">
            {typeScale.map((style) => (
              <div className="grid items-baseline gap-2 sm:grid-cols-[1fr_auto]" key={style.label}>
                <p className={style.className}>{style.label}</p>
                <p className="font-mono text-xs text-olive-500">{style.details}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Icons">
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-12">
            {icons.map(([name, Icon]) => (
              <div
                className="flex aspect-square items-center justify-center rounded-lg bg-white ring-[0.5px] ring-black/15 ring-inset dark:bg-white/3 dark:ring-white/10"
                key={name}
                title={name}
              >
                <Icon />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Avatar">
          <div className="flex flex-wrap items-end gap-10">
            {avatarSizes.map((size) => (
              <div className="flex flex-col items-center gap-4" key={size}>
                <Avatar size={size}>
                  <AvatarFallback>SW</AvatarFallback>
                  <AvatarBadge />
                </Avatar>
                <AvatarGroup>
                  {["JL", "AK", "ML"].map((initials) => (
                    <Avatar key={initials} size={size}>
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  ))}
                  <AvatarGroupCount>+2</AvatarGroupCount>
                </AvatarGroup>
                <span className="font-mono text-xs text-olive-500">{size}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Badge">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="primary">Primary</Badge>
          </div>
        </Section>

        <Section title="Button">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="primary">Primary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled>Default</Button>
              <Button disabled variant="primary">
                Primary
              </Button>
              <Button disabled variant="ghost">
                Ghost
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button>
                <Icons.Add01Icon />
                With icon
              </Button>
              <Button size="sm">Small</Button>
              <Button shape="pill" variant="ghost">
                Pill
              </Button>
              <Button aria-label="Filter" size="icon">
                <Icons.FilterIcon />
              </Button>
              <Button aria-label="Filter" size="icon-sm">
                <Icons.FilterIcon />
              </Button>
            </div>
          </div>
        </Section>

        <Section title="Checkbox">
          <CheckboxExamples />
        </Section>

        <Section title="Combobox">
          <div className="flex max-w-sm flex-col gap-8">
            <SingleComboboxExample />
            <CompactComboboxExample />
            <CreatableComboboxExample />
          </div>
        </Section>

        <Section title="Command palette">
          <CommandPaletteExample />
        </Section>

        <Section title="Dialog">
          <DialogExamples />
        </Section>

        <Section title="Drawer">
          <DrawerExamples />
        </Section>

        <Section title="Dropdown menu">
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants()}>Items</DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Recipe</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <Icons.FileEditIcon />
                    Edit recipe
                    <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Icons.Calendar03Icon />
                      Add to meal plan
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-48">
                      <DropdownMenuItem>Måndag</DropdownMenuItem>
                      <DropdownMenuItem>Tisdag</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Next week…</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem disabled>
                    <Icons.File02Icon />
                    Duplicate
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Icons.Cancel01Icon />
                  Delete recipe
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants()}>Checkbox items</DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Show metadata</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem defaultChecked>Meal type</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Cuisine</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem disabled>Cooking effort</DropdownMenuCheckboxItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem inset>Reset metadata</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants()}>Radio items</DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Sort recipes by</DropdownMenuLabel>
                  <DropdownMenuRadioGroup defaultValue="name">
                    <DropdownMenuRadioItem value="name">Name (A–Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="created">Recently created</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem disabled value="manual">
                      Manual order
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem inset>Reset sorting</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Section>

        <Section title="Empty">
          <Empty>
            <EmptyIllustration
              className="w-44"
              height="178"
              src="/images/empty-chopsticks.avif"
              width="360"
            />
            <EmptyHeader>
              <EmptyTitle>No recipes yet</EmptyTitle>
              <EmptyDescription>Add the dishes your family cooks most.</EmptyDescription>
            </EmptyHeader>
            <Button variant="primary">New recipe</Button>
          </Empty>
        </Section>
        <Section title="Field">
          <FieldExamples />
        </Section>

        <Section title="Input">
          <InputExamples />
        </Section>

        <Section title="Label">
          <div className="flex max-w-sm flex-col gap-1.5">
            <Label htmlFor="label-example">Recipe title</Label>
            <Input id="label-example" placeholder="Pasta carbonara" />
          </div>
        </Section>

        <Section title="Popover">
          <div>
            <PopoverExample />
          </div>
        </Section>

        <Section title="Radio group">
          <RadioGroupExample />
        </Section>

        <Section title="Scroll area">
          <ScrollArea
            className="h-48 max-w-sm rounded-xl border bg-white dark:bg-white/3"
            scrollFade
          >
            <ul className="flex flex-col gap-2 p-4">
              {scrollItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ScrollArea>
        </Section>

        <Section title="Select">
          <SelectExamples />
        </Section>

        <Section title="Tabs">
          <TabsExample />
        </Section>

        <Section title="Textarea">
          <TextareaExamples />
        </Section>

        <Section title="Toggle">
          <ToggleExamples />
        </Section>

        <Section title="Toggle group">
          <ToggleGroupExamples />
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-10">
      <h2 className="flex items-center gap-3 font-medium text-olive-500 after:flex-1 after:border-t after:border-dashed after:border-black/15 dark:after:border-white/10">
        {title}
      </h2>
      {children}
    </section>
  );
}

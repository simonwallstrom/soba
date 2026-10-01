import { Button } from "@client/components/ui/button";
import { Checkbox } from "@client/components/ui/checkbox";
import { Add01Icon, MinusSignIcon } from "@client/components/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@client/components/ui/tabs";
import type { RecipeSection } from "@shared/recipes";
import { cn } from "cn";
import { useState } from "react";

type ContentProps = {
  ingredients: readonly RecipeSection[];
  instructions: readonly RecipeSection[];
  servings: number | null;
};

// Tabs on small screens; side-by-side columns on large ones.
export function RecipeContent({ ingredients, instructions, servings }: ContentProps) {
  return (
    <>
      <Tabs className="lg:hidden" defaultValue="ingredients">
        <div className="sticky top-0 z-20 -mx-5 border-y-[0.5px] border-black/18 bg-olive-50 p-2 dark:border-white/10 dark:bg-olive-925">
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="ingredients">
              Ingredients
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="instructions">
              Instructions
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent className="pt-5" keepMounted value="ingredients">
          <Ingredients hideHeading idPrefix="mobile" sections={ingredients} servings={servings} />
        </TabsContent>
        <TabsContent className="pt-3" keepMounted value="instructions">
          <Instructions hideHeading idPrefix="mobile" sections={instructions} />
        </TabsContent>
      </Tabs>
      <div className="hidden gap-16 border-t pt-12 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Ingredients idPrefix="desktop" sections={ingredients} servings={servings} />
        <Instructions idPrefix="desktop" sections={instructions} />
      </div>
    </>
  );
}

type SectionListProps = {
  hideHeading?: boolean;
  idPrefix: string;
  sections: readonly RecipeSection[];
};

function Ingredients({
  hideHeading = false,
  idPrefix,
  sections,
  servings,
}: SectionListProps & { servings: number | null }) {
  const headingId = `${idPrefix}-ingredients-heading`;
  const [servingsValue, setServingsValue] = useState(servings);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className={hideHeading ? "sr-only" : "text-xl font-medium"} id={headingId}>
          Ingredients
        </h2>
        {servingsValue !== null && (
          <ServingsControl
            fullWidth={hideHeading}
            onValueChange={setServingsValue}
            value={servingsValue}
          />
        )}
      </div>
      {sections.length === 0 ? (
        <p className="text-olive-500">No ingredients yet.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map((section, index) => {
            const sectionHeadingId = `${idPrefix}-ingredients-${index}-heading`;
            return (
              // Sections have no identity of their own; they only change when the recipe does.
              <section
                aria-labelledby={section.heading ? sectionHeadingId : undefined}
                className="flex flex-col gap-2"
                key={index}
              >
                {section.heading && (
                  <h3 className="font-medium" id={sectionHeadingId}>
                    {section.heading}
                  </h3>
                )}
                <ul className="divide-y divide-dashed border-y border-dashed">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      <label className="flex cursor-pointer items-start gap-3 py-2.5 text-left has-checked:text-olive-400 has-checked:line-through dark:has-checked:text-olive-600">
                        <Checkbox className="mt-0.5" />
                        <span>{item}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Instructions({ hideHeading = false, idPrefix, sections }: SectionListProps) {
  const headingId = `${idPrefix}-instructions-heading`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <h2 className={hideHeading ? "sr-only" : "text-xl font-medium"} id={headingId}>
        Instructions
      </h2>
      {sections.length === 0 ? (
        <p className="text-olive-500">No instructions yet.</p>
      ) : (
        <div className="flex max-w-2xl flex-col gap-8 [counter-reset:steps]">
          {sections.map((section, index) => {
            const sectionHeadingId = `${idPrefix}-instructions-${index}-heading`;
            return (
              <section
                aria-labelledby={section.heading ? sectionHeadingId : undefined}
                className="flex flex-col gap-3"
                key={index}
              >
                {section.heading && (
                  <h3 className="font-medium" id={sectionHeadingId}>
                    {section.heading}
                  </h3>
                )}
                <ol className="flex flex-col gap-5">
                  {section.items.map((item, itemIndex) => (
                    <li
                      className="grid grid-cols-[2rem_minmax(0,1fr)] leading-6 [counter-increment:steps] before:font-mono before:text-olive-400 before:content-[counter(steps,decimal-leading-zero)]"
                      key={itemIndex}
                    >
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

// Only changes the shown number for now; ingredient amounts scale in a later change.
// A new recipe starts without servings, shown as a dash until the first increase.
export function ServingsControl({
  fullWidth,
  onValueChange,
  value,
}: {
  fullWidth: boolean;
  onValueChange: (value: number) => void;
  value: number | null;
}) {
  return (
    <div
      className={cn("flex items-center", fullWidth ? "w-full justify-between" : "ml-auto gap-3")}
    >
      <div className="flex items-baseline gap-1.5 text-sm font-medium text-olive-500">
        <span>Servings</span>
        <output aria-live="polite" className="text-olive-950 tabular-nums dark:text-white">
          {value ?? "—"}
        </output>
      </div>
      <div className="flex items-center gap-1">
        <Button
          aria-label="Decrease servings"
          disabled={value === null || value <= 1}
          onClick={() => onValueChange(Math.max(1, (value ?? 1) - 1))}
          size="icon-sm"
        >
          <MinusSignIcon />
        </Button>
        <Button
          aria-label="Increase servings"
          disabled={value !== null && value >= 99}
          onClick={() => onValueChange(Math.min(99, (value ?? 0) + 1))}
          size="icon-sm"
        >
          <Add01Icon />
        </Button>
      </div>
    </div>
  );
}

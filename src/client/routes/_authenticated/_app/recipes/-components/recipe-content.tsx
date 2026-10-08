import { Button } from "@client/components/ui/button";
import { Checkbox } from "@client/components/ui/checkbox";
import { Add01Icon, MinusSignIcon } from "@client/components/ui/icons";
import { textButtonStyles } from "@client/components/ui/styles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@client/components/ui/tabs";
import { scaleIngredient } from "@client/features/recipes/scale-ingredient";
import type { RecipeSection } from "@shared/recipes";
import { cn } from "cn";

import { useCookingSession } from "./cooking-session";
import type { CookingMarks } from "./cooking-session";

type ContentProps = {
  // Writes scaled decimals the household's way, such as "2,5" in Swedish.
  decimalSeparator: string;
  ingredients: readonly RecipeSection[];
  instructions: readonly RecipeSection[];
  recipeId: string;
  servings: number | null;
};

type CookingSession = ReturnType<typeof useCookingSession>;

// Tabs on small screens; side-by-side columns on large ones. Both show the same cooking session.
// Key it by the recipe ID, so moving to another recipe starts from that recipe's session.
export function RecipeContent({
  decimalSeparator,
  ingredients,
  instructions,
  recipeId,
  servings,
}: ContentProps) {
  const session = useCookingSession(recipeId, servings);
  const ingredientsProps = {
    decimalSeparator,
    recipeServings: servings,
    sections: ingredients,
    session,
  };

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
          <Ingredients hideHeading idPrefix="mobile" {...ingredientsProps} />
        </TabsContent>
        <TabsContent className="pt-3" keepMounted value="instructions">
          <Instructions done={session.done} hideHeading idPrefix="mobile" sections={instructions} />
        </TabsContent>
      </Tabs>
      <div className="hidden gap-16 border-t pt-12 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Ingredients idPrefix="desktop" {...ingredientsProps} />
        <Instructions done={session.done} idPrefix="desktop" sections={instructions} />
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
  decimalSeparator,
  hideHeading = false,
  idPrefix,
  recipeServings,
  sections,
  session,
}: SectionListProps & {
  decimalSeparator: string;
  recipeServings: number | null;
  session: CookingSession;
}) {
  const headingId = `${idPrefix}-ingredients-heading`;
  const { servings } = session;
  const factor = servings !== null && recipeServings !== null ? servings / recipeServings : 1;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className={hideHeading ? "sr-only" : "text-xl font-medium"} id={headingId}>
            Ingredients
          </h2>
          {servings !== null && (
            <ServingsControl
              fullWidth={hideHeading}
              onValueChange={session.setServings}
              value={servings}
            />
          )}
        </div>
        {/* A scaled recipe says so, so nobody cooks from it by mistake. */}
        {factor !== 1 && recipeServings !== null && (
          <p className="flex items-center gap-1 text-sm text-olive-500">
            <span className="italic">
              Amounts scaled from {recipeServings} {recipeServings === 1 ? "serving" : "servings"}.
            </span>
            <button
              className={cn(textButtonStyles)}
              onClick={() => session.setServings(recipeServings)}
              type="button"
            >
              Reset
            </button>
          </p>
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
                  {section.items.map((item, itemIndex) => {
                    const { amount, rest } = scaleIngredient(item, factor, decimalSeparator);
                    return (
                      <li key={itemIndex}>
                        <label className="flex cursor-pointer items-start gap-3 py-2.5 text-left has-checked:text-olive-400 has-checked:line-through dark:has-checked:text-olive-600">
                          <Checkbox
                            checked={session.checked.has(item)}
                            className="mt-0.5"
                            onCheckedChange={(isChecked) => session.checked.set(item, isChecked)}
                          />
                          <span>
                            {amount !== null && (
                              <mark className="rounded-sm bg-amber-200/60 px-0.5 text-inherit dark:bg-amber-300/20">
                                {amount}
                              </mark>
                            )}
                            {rest}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <MarksFooter
        action="Uncheck all"
        marks={session.checked}
        sections={sections}
        status="checked"
      />
    </section>
  );
}

function Instructions({
  done,
  hideHeading = false,
  idPrefix,
  sections,
}: SectionListProps & { done: CookingMarks }) {
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
                <ol className="flex flex-col gap-3">
                  {section.items.map((item, itemIndex) => (
                    <li className="[counter-increment:steps]" key={itemIndex}>
                      {/* A done step dims and trades its number for a check, but stays readable. */}
                      <button
                        aria-pressed={done.has(item)}
                        className="-mx-2 grid w-[calc(100%+1rem)] cursor-pointer grid-cols-[2rem_minmax(0,1fr)] rounded-lg px-2 py-1 text-left leading-6 before:font-mono before:text-olive-400 before:content-[counter(steps,decimal-leading-zero)] hover:bg-black/4 focus-visible:outline-2 focus-visible:outline-offset-1 aria-pressed:text-olive-400 aria-pressed:before:content-['✓'] dark:hover:bg-white/5 dark:aria-pressed:text-olive-600"
                        onClick={() => done.set(item, !done.has(item))}
                        type="button"
                      >
                        <span>{item}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}
      <MarksFooter action="Unmark all" marks={done} sections={sections} status="done" />
    </section>
  );
}

// How many items are marked, and a way to unmark them, once any are.
function MarksFooter({
  action,
  marks,
  sections,
  status,
}: {
  action: string;
  marks: CookingMarks;
  sections: readonly RecipeSection[];
  status: string;
}) {
  const items = sections.flatMap((section) => section.items);
  // Marks for lines since edited away don't count.
  const markedCount = items.filter((item) => marks.has(item)).length;
  if (markedCount === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 text-sm text-olive-500">
      <span aria-live="polite">
        {markedCount} of {items.length} {status}
      </span>
      <button className={cn(textButtonStyles)} onClick={marks.clear} type="button">
        {action}
      </button>
    </div>
  );
}

// A new recipe in the form starts without servings, shown as a dash until the first increase.
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

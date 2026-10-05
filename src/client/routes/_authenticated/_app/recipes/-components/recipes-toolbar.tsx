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
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import {
  Add01Icon,
  Calendar03Icon,
  FileEditIcon,
  ImageUploadIcon,
  LinkSquare02Icon,
  Sorting03Icon,
} from "@client/components/ui/icons";
import { recipeDetails } from "@shared/recipes";
import type { RecipeDetail, RecipeSort, RecipeView } from "@shared/recipes";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import type { ReactNode } from "react";

import type { ImportSource } from "./recipe-import-dialog";

const viewOptions = [
  { label: "List", value: "list" },
  { label: "Grid", value: "grid" },
] as const satisfies readonly { label: string; value: RecipeView }[];

const sortOptions = [
  { label: "Name (A–Z)", value: "name" },
  { label: "Recently created", value: "created" },
  { label: "Recently updated", value: "updated" },
] as const satisfies readonly { label: string; value: RecipeSort }[];

const detailOptions = [
  { label: "Author", value: "author" },
  { label: "Tags", value: "tags" },
] as const satisfies readonly { label: string; value: RecipeDetail }[];

// Creating a recipe, then the side panel.
export function RecipesHeaderActions({
  isMealPlannerOpen,
  onImport,
  onMealPlannerOpenChange,
}: {
  isMealPlannerOpen: boolean;
  onImport: (source: ImportSource) => void;
  onMealPlannerOpenChange: (isOpen: boolean) => void;
}) {
  return (
    <div className="-mr-2 flex items-center">
      <DropdownMenu>
        {/* The page's main action gets a label; phones shrink it back to an icon. */}
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "max-sm:size-8 rounded-full max-sm:p-0",
          )}
        >
          <Add01Icon />
          <span className="max-sm:sr-only">New recipe</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem render={<Link to="/recipes/new" />}>
            <FileEditIcon />
            Manual entry
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onImport("url")}>
            <LinkSquare02Icon />
            Import from link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onImport("photos")}>
            <ImageUploadIcon />
            Import from photo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="hidden items-center lg:flex">
        <div className="mx-3 h-3.5 w-px bg-black/12 dark:bg-white/8" />
        <Button
          aria-controls="meal-planner-sidebar"
          aria-expanded={isMealPlannerOpen}
          aria-label={isMealPlannerOpen ? "Close meal planner" : "Open meal planner"}
          data-pressed={isMealPlannerOpen || undefined}
          onClick={() => onMealPlannerOpenChange(!isMealPlannerOpen)}
          size="icon"
          variant="ghost"
        >
          <Calendar03Icon />
        </Button>
      </div>
    </div>
  );
}

// A lighter bar above the list for what shapes it: search, then filter and display controls past
// a divider, like the header's. Active filters get a line of their own below.
export function RecipesToolbar({
  activeFilters,
  filter,
  onSortChange,
  onViewChange,
  onVisibleDetailsChange,
  search,
  sort,
  view,
  visibleDetails,
}: {
  activeFilters: ReactNode;
  filter: ReactNode;
  onSortChange: (sort: RecipeSort) => void;
  onViewChange: (view: RecipeView) => void;
  onVisibleDetailsChange: (details: RecipeDetail[]) => void;
  search: ReactNode;
  sort: RecipeSort;
  view: RecipeView;
  visibleDetails: readonly RecipeDetail[];
}) {
  return (
    <section
      aria-label="Recipe list controls"
      className="border-b-[0.5px] border-black/18 bg-olive-100 dark:border-white/10 dark:bg-olive-900"
    >
      <div className="flex h-10 items-center pr-3 pl-5 lg:pr-4 lg:pl-6">
        {search}
        <div className="mx-3 h-3.5 w-px bg-black/12 dark:bg-white/8" />
        {filter}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Display settings"
            className={buttonVariants({ size: "icon", variant: "ghost" })}
            title="Display"
          >
            <Sorting03Icon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>View</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={view} onValueChange={onViewChange}>
                {viewOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sort} onValueChange={onSortChange}>
                {sortOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Visible details</DropdownMenuLabel>
              {detailOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  checked={visibleDetails.includes(option.value)}
                  key={option.value}
                  onCheckedChange={(checked) =>
                    onVisibleDetailsChange(
                      recipeDetails.filter((detail) =>
                        detail === option.value ? checked : visibleDetails.includes(detail),
                      ),
                    )
                  }
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {activeFilters}
    </section>
  );
}

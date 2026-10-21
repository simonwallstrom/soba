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
import { WithTooltip } from "@client/components/ui/tooltip";
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

const dividerClassName = "mx-3 h-3.5 w-px shrink-0 bg-black/12 dark:bg-white/8";

// What shapes the list, then a divider on wide screens, then creating a recipe and the side
// panel. Fills the row, so on phones the search that leads the list controls can take it all.
export function RecipesHeaderActions({
  isMealPlannerOpen,
  listControls,
  onImport,
  onMealPlannerOpenChange,
}: {
  isMealPlannerOpen: boolean;
  listControls: ReactNode;
  onImport: (source: ImportSource) => void;
  onMealPlannerOpenChange: (isOpen: boolean) => void;
}) {
  return (
    <div className="-mr-2 flex min-w-0 flex-1 items-center justify-end">
      {listControls}
      {listControls && <div className={cn(dividerClassName, "max-lg:hidden")} />}
      <DropdownMenu>
        <WithTooltip>
          <DropdownMenuTrigger
            aria-label="New recipe"
            className={buttonVariants({ size: "icon", variant: "ghost" })}
          >
            <Add01Icon />
          </DropdownMenuTrigger>
        </WithTooltip>
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
        {!listControls && <div className={dividerClassName} />}
        <WithTooltip>
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
        </WithTooltip>
      </div>
    </div>
  );
}

// How the list looks: its view, its order, and the details each recipe shows.
export function RecipesDisplayMenu({
  onSortChange,
  onViewChange,
  onVisibleDetailsChange,
  sort,
  view,
  visibleDetails,
}: {
  onSortChange: (sort: RecipeSort) => void;
  onViewChange: (view: RecipeView) => void;
  onVisibleDetailsChange: (details: RecipeDetail[]) => void;
  sort: RecipeSort;
  view: RecipeView;
  visibleDetails: readonly RecipeDetail[];
}) {
  return (
    <DropdownMenu>
      <WithTooltip label="Display">
        <DropdownMenuTrigger
          aria-label="Display settings"
          className={buttonVariants({ size: "icon", variant: "ghost" })}
        >
          <Sorting03Icon />
        </DropdownMenuTrigger>
      </WithTooltip>
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
  );
}

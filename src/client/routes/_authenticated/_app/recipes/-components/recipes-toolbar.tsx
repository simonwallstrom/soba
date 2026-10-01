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
import type { ReactNode } from "react";

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

// Controls that shape the list come first, then creating a recipe, then the side panel.
export function RecipesToolbar({
  search,
  filter,
  isMealPlannerOpen,
  onMealPlannerOpenChange,
  onSortChange,
  onViewChange,
  onVisibleDetailsChange,
  sort,
  view,
  visibleDetails,
}: {
  search: ReactNode;
  filter: ReactNode;
  isMealPlannerOpen: boolean;
  onMealPlannerOpenChange: (isOpen: boolean) => void;
  onSortChange: (sort: RecipeSort) => void;
  onViewChange: (view: RecipeView) => void;
  onVisibleDetailsChange: (details: RecipeDetail[]) => void;
  sort: RecipeSort;
  view: RecipeView;
  visibleDetails: readonly RecipeDetail[];
}) {
  return (
    <div className="-mr-2 flex items-center">
      {search}
      {filter}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Display settings"
          className={buttonVariants({ size: "icon", variant: "ghost" })}
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
      {/* A prototype: only manual entry opens, and it does not save yet. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Create recipe"
          className={buttonVariants({ size: "icon", variant: "ghost" })}
        >
          <Add01Icon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem render={<Link to="/recipes/new" />}>
            <FileEditIcon />
            Manual entry
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <LinkSquare02Icon />
            Import from URL
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
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

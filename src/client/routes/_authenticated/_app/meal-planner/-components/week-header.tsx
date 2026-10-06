import { Badge } from "@client/components/ui/badge";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import {
  Copy01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
  SparklesIcon,
} from "@client/components/ui/icons";

import { formatWeekRange } from "../-meal-plan";
import type { PlannerWeek } from "../-meal-plan";

// A gray band that sticks under the app header while its week scrolls past; the next week's band
// pushes it away. Its 40px row matches the recipes toolbar: once stuck, it shifts up by its top
// border, which hides under the header's. It overlaps the week above by the same width so two
// bands that meet share one hairline. It stacks above the meals' action buttons, which sit at z-10.
//
// Suggesting gets a button of its own while there are days to fill. The menu holds what acts on
// planned meals, so an empty week goes without it.
export function WeekHeader({
  canClear,
  canSuggest,
  copyTargets,
  hasMeals,
  onClear,
  onCopyTo,
  onSuggest,
  week,
}: {
  // Whether any meals are planned on days still ahead.
  canClear: boolean;
  // Whether any days still ahead are open.
  canSuggest: boolean;
  copyTargets: readonly PlannerWeek[];
  hasMeals: boolean;
  onClear: () => void;
  onCopyTo: (target: PlannerWeek) => void;
  onSuggest: () => void;
  week: PlannerWeek;
}) {
  return (
    <header className="sticky top-0 z-20 col-span-full -mt-[0.5px] flex h-[41px] -translate-y-[0.5px] items-center gap-2 border-y-[0.5px] border-black/18 bg-olive-100 pr-3 pl-5 lg:pr-4 lg:pl-6 dark:border-white/10 dark:bg-olive-900">
      <h2 className="font-medium whitespace-nowrap">Week {week.number}</h2>
      <span className="truncate text-olive-500">{formatWeekRange(week)}</span>
      {week.offset === 0 && <Badge variant="primary">Current</Badge>}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {canSuggest && (
          <Button onClick={onSuggest} shape="pill" variant="ghost">
            <SparklesIcon />
            Suggest meals
          </Button>
        )}
        {hasMeals && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`More actions for week ${week.number}`}
              className={buttonVariants({ size: "icon", variant: "ghost" })}
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Copy01Icon />
                  Copy to…
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-60">
                  {copyTargets.map((target) => (
                    <DropdownMenuItem key={target.offset} onClick={() => onCopyTo(target)}>
                      <span className="font-medium">Week {target.number}</span>
                      <span className="text-olive-500">{formatWeekRange(target)}</span>
                      {target.offset === 0 && <Badge className="ml-auto">Current</Badge>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              {canClear && (
                <DropdownMenuItem onClick={onClear}>
                  <Delete02Icon />
                  Clear week
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}

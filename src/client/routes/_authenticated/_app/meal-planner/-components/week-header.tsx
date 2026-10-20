import { Badge } from "@client/components/ui/badge";
import { buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { Copy01Icon, Delete02Icon, MoreHorizontalIcon } from "@client/components/ui/icons";
import { cn } from "cn";

import { formatWeekRange } from "../-meal-plan";
import type { PlannerWeek } from "../-meal-plan";

// A rounded gray label that sticks under the app header while its week scrolls past; the next
// week's label pushes it away. The label is inset to the edges the meals highlight to, and sits in
// a strip of the page's own color, so meals scrolling under it don't show around its corners. The
// strip stacks above the meals' action buttons, which sit at z-10. Its buttons take the default
// 8px corners, not the round ones used elsewhere, so they sit concentric in the label's 12px
// corners, 4px in.
//
// The menu holds what acts on planned meals, so an empty week goes without it.
export function WeekHeader({
  canClear,
  copyTargets,
  hasMeals,
  onClear,
  onCopyTo,
  week,
}: {
  // Whether any meals are planned on days still ahead.
  canClear: boolean;
  copyTargets: readonly PlannerWeek[];
  hasMeals: boolean;
  onClear: () => void;
  onCopyTo: (target: PlannerWeek) => void;
  week: PlannerWeek;
}) {
  return (
    <header className="sticky top-0 z-20 col-span-full bg-white px-2 pt-2 lg:px-3 lg:pt-3 dark:bg-olive-925">
      <div className="flex h-10 items-center gap-2 rounded-xl bg-olive-100 pr-1 pl-3 dark:bg-olive-900">
        <h2 className="font-medium whitespace-nowrap">Week {week.number}</h2>
        <span className="truncate text-olive-500">{formatWeekRange(week)}</span>
        {week.offset === 0 && <Badge variant="primary">Current</Badge>}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {hasMeals && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`More actions for week ${week.number}`}
                className={cn(buttonVariants({ size: "icon", variant: "ghost" }), "rounded-lg")}
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Copy01Icon />
                    Copy to…
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="min-w-60">
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
      </div>
    </header>
  );
}

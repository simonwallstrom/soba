import { Button } from "@client/components/ui/button";
import {
  Calendar03Icon,
  FilterIcon,
  MoreHorizontalIcon,
  Share08Icon,
  StarIcon,
} from "@client/components/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@client/components/ui/tooltip";
import type { ReactNode } from "react";

const toolbar = [
  { label: "Add to favorites", icon: <StarIcon /> },
  { label: "Share recipe", icon: <Share08Icon /> },
  { label: "Filter", icon: <FilterIcon /> },
  { label: "Open meal planner", icon: <Calendar03Icon /> },
  { label: "More actions", icon: <MoreHorizontalIcon /> },
];

const sides = ["top", "right", "bottom", "left"] as const;

// Icon buttons in a row, like a header's: hover one, then move along, and the rest open at once.
export function TooltipExamples() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex gap-1">
        {toolbar.map(({ icon, label }) => (
          <IconButtonWithTooltip key={label} label={label}>
            {icon}
          </IconButtonWithTooltip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {sides.map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger render={<Button />}>
              {side.charAt(0).toUpperCase() + side.slice(1)}
            </TooltipTrigger>
            <TooltipContent side={side}>Opens {side}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function IconButtonWithTooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button aria-label={label} size="icon" variant="ghost" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

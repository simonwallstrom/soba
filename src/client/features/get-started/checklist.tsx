import { Collapsible } from "@base-ui/react/collapsible";
import { buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import {
  CheckIcon,
  ChevronDownIcon,
  MoreHorizontalIcon,
  ViewOffIcon,
} from "@client/components/ui/icons";
import { toast } from "@client/components/ui/toast";
import { connectionsOptions } from "@client/features/assistants/connections";
import { useMembersById } from "@client/features/household/members";
import { usePlannedMeals } from "@client/features/meal-plan/meal-plan-data";
import { useRecipes } from "@client/features/recipes/recipe-data";
import { api } from "@client/lib/api";
import { queryClient } from "@client/lib/query";
import { invalidateSession, sessionOptions } from "@client/lib/session";
import type { Session } from "@client/lib/session";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { LinkComponentProps } from "@tanstack/react-router";
import { cn } from "cn";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type Step = {
  label: string;
  done: boolean;
  link?: Pick<LinkComponentProps, "to" | "hash">;
};

type ChecklistProps = {
  household: { role: "owner" | "member"; checklistHidden: boolean };
  user: { id: string };
};

// Each step is ticked off by what the member has done, never by clicking it. Only the owner can
// invite, so members who joined get the steps that are theirs to do.
function useSteps(userId: string, role: "owner" | "member") {
  const recipes = useRecipes();
  const meals = usePlannedMeals();
  const members = useMembersById();
  const connections = useQuery(connectionsOptions);

  const steps: (Step | false)[] = [
    role === "owner" && { label: "Create your household", done: true },
    {
      label: "Add your first recipe",
      done: recipes.some(({ createdBy }) => createdBy === userId),
      link: { to: "/recipes/new" },
    },
    // The invite link is on from the start, so only someone joining counts.
    role === "owner" && {
      label: "Invite your family",
      done: (members?.size ?? 0) > 1,
      link: { to: "/settings", hash: "members" },
    },
    {
      label: "Plan a dinner",
      done: meals.some(({ plannedBy }) => plannedBy === userId),
      link: { to: "/meal-planner" },
    },
    {
      label: "Connect an AI assistant",
      done: (connections.data?.length ?? 0) > 0,
      link: { to: "/settings", hash: "assistants" },
    },
  ];
  // Waits for the assistants, so the count doesn't jump once they load.
  return connections.isPending ? null : steps.filter((step) => step !== false);
}

// Hidden for good, on every device. Shown hidden at once; the session refetch keeps it so, or
// brings the checklist back if the server refused.
async function hideChecklist() {
  queryClient.setQueryData(sessionOptions.queryKey, (session): Session | undefined =>
    session?.user && session.household
      ? { ...session, household: { ...session.household, checklistHidden: true } }
      : session,
  );
  await sendHide();
  await invalidateSession();
}

async function sendHide() {
  try {
    const response = await api.household.checklist.hide.$post();
    if (!response.ok) throw new Error(`API returned ${response.status}`);
  } catch {
    toast.add({ title: "Could not hide the checklist. Please try again." });
  }
}

// The sidebar and the phone layout both mount a checklist, so finishing is saved once.
let finishSaved = false;

/**
 * The member's progress, or null while it's hidden or still loading. Once every step is done,
 * that's saved as hidden without hiding it here, so "You're all set" stays until the member
 * moves on.
 */
function useChecklist({ household, user }: ChecklistProps) {
  const steps = useSteps(user.id, household.role);
  const allDone = steps !== null && steps.every(({ done }) => done);

  useEffect(() => {
    if (!allDone || household.checklistHidden || finishSaved) return;
    finishSaved = true;
    void sendHide();
  }, [allDone, household.checklistHidden]);

  if (household.checklistHidden || steps === null) return null;
  return {
    steps,
    allDone,
    doneCount: steps.filter(({ done }) => done).length,
    next: steps.find(({ done }) => !done),
  };
}

// Whether the steps show is kept per device; until it's changed, the caller decides.
const openStorageKey = "soba-get-started-open";

function readStoredOpen() {
  try {
    const stored = localStorage.getItem(openStorageKey);
    return stored === null ? null : stored === "true";
  } catch {
    return null;
  }
}

function storeOpen(open: boolean) {
  try {
    localStorage.setItem(openStorageKey, String(open));
  } catch {
    // Storage is unavailable: the steps show as the caller decides next time.
  }
}

// Raised like the popups in ui/styles.ts, with a shadow fit for a card at rest. In light mode it
// lets the sidebar tint through; on phones it sits on the white page, so it stays white.
const cardStyles = [
  "relative rounded-xl border-[0.5px] border-black/15 bg-white/60",
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-xl)-0.5px)] before:shadow-sm before:shadow-black/6 before:content-['']",
  "dark:border-white/12 dark:bg-olive-900 dark:before:inset-[-0.5px] dark:before:rounded-xl dark:before:inset-shadow-[0_0.5px_0_var(--color-white)]/12 dark:before:shadow-black/40",
];

const iconButtonStyles = buttonVariants({
  className: "text-olive-500",
  size: "icon-sm",
  variant: "ghost",
});

/**
 * A "Get started" checklist for a new member: what Soba is for, step by step, with their
 * progress. It sits at the bottom of the sidebar, and above the tab bar on phones, where it
 * starts folded and folds again after a step is opened, to leave the page its room.
 */
export function GetStartedChecklist({
  className,
  compact = false,
  ...props
}: ChecklistProps & { className?: string; compact?: boolean }) {
  const checklist = useChecklist(props);
  const [open, setOpen] = useState(() => readStoredOpen() ?? !compact);
  if (!checklist) return null;
  const { steps, allDone, doneCount, next } = checklist;

  return (
    <section aria-label="Get started" className={cn(cardStyles, className)}>
      {allDone ? (
        <AllSet />
      ) : (
        <Collapsible.Root
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            storeOpen(nextOpen);
          }}
          open={open}
        >
          <div className="flex flex-col gap-1 pt-1.5 pr-1.5 pb-3 pl-3">
            <div className="flex items-center gap-1">
              <h2 className="font-medium text-olive-950 dark:text-olive-100">Get started</h2>
              <Count doneCount={doneCount} total={steps.length} />
              <div className="ml-auto flex">
                <MoreMenu />
                {/* The card sits low, so it folds down toward its header and opens upward. */}
                <Collapsible.Trigger aria-label="Steps" className={cn(iconButtonStyles, "group")}>
                  <ChevronDownIcon className="mt-px size-4 rotate-180 transition-transform duration-150 group-data-panel-open:rotate-0" />
                </Collapsible.Trigger>
              </div>
            </div>
            <ProgressBar className="mr-1.5" doneCount={doneCount} total={steps.length} />
          </div>
          <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-150 data-ending-style:h-0 data-starting-style:h-0">
            <StepList
              className="-mt-1 px-1.5 pb-1.5"
              next={next}
              onNavigate={compact ? () => setOpen(false) : undefined}
              steps={steps}
            />
          </Collapsible.Panel>
        </Collapsible.Root>
      )}
    </section>
  );
}

function AllSet() {
  return (
    <div className="flex flex-col gap-1 p-3">
      <h2 className="font-medium text-olive-950 dark:text-olive-100">You’re all set</h2>
      <p className="text-sm text-olive-600 dark:text-olive-400">
        That’s everything. Happy cooking!
      </p>
      <button
        className="mt-1 self-start rounded-md text-sm text-olive-500 hover:text-olive-800 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:text-olive-200"
        onClick={() => void hideChecklist()}
        type="button"
      >
        Dismiss
      </button>
    </div>
  );
}

function Count({ doneCount, total }: { doneCount: number; total: number }) {
  return (
    <span className="ml-1 text-sm text-olive-500 tabular-nums">
      {doneCount} of {total}
    </span>
  );
}

// Hiding is for good, so it's a step away in a menu rather than a button beside minimizing.
function MoreMenu({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="More actions for Get started"
        className={cn(iconButtonStyles, className)}
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem onClick={() => void hideChecklist()}>
          <ViewOffIcon />
          Hide checklist
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProgressBar({
  className,
  doneCount,
  total,
}: {
  className?: string;
  doneCount: number;
  total: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("h-1 overflow-hidden rounded-full bg-olive-200 dark:bg-olive-800", className)}
    >
      <span
        className="block h-full rounded-full bg-olive-800 transition-[width] duration-300 dark:bg-olive-300"
        style={{ width: `${(doneCount / total) * 100}%` }}
      />
    </span>
  );
}

function StepList({
  className,
  next,
  onNavigate,
  steps,
}: {
  className?: string;
  next: Step | undefined;
  onNavigate?: (() => void) | undefined;
  steps: Step[];
}) {
  return (
    <ol className={cn("flex flex-col gap-0.5", className)}>
      {steps.map((step) => (
        <li key={step.label}>
          <StepRow isNext={step === next} onNavigate={onNavigate} step={step} />
        </li>
      ))}
    </ol>
  );
}

// The next step stands out; done ones recede but still link to where they were done.
function StepRow({
  isNext,
  onNavigate,
  step,
}: {
  isNext: boolean;
  onNavigate: (() => void) | undefined;
  step: Step;
}) {
  const content: ReactNode = (
    <>
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full pointer-coarse:size-5",
          step.done
            ? "bg-olive-800 text-olive-50 dark:bg-olive-300 dark:text-olive-950"
            : "border border-olive-300 group-hover:border-olive-400 dark:border-olive-700 dark:group-hover:border-olive-600",
        )}
      >
        {step.done && (
          <CheckIcon className="mt-px size-3 pointer-coarse:size-3.5" strokeWidth={2.5} />
        )}
      </span>
      <span className="truncate">{step.label}</span>
    </>
  );
  const styles = cn(
    "flex h-7 items-center gap-2 rounded-lg px-1.5 text-sm pointer-coarse:h-11 pointer-coarse:gap-3",
    step.done ? "text-olive-500" : "text-olive-800 dark:text-olive-300",
    isNext && "font-medium text-olive-950 dark:text-olive-100",
  );

  if (!step.link) return <span className={styles}>{content}</span>;
  return (
    <Link
      {...step.link}
      className={cn(
        styles,
        "group hover:bg-olive-200/70 focus-visible:outline-2 focus-visible:-outline-offset-1 active:bg-olive-200/70 dark:hover:bg-olive-900/50 dark:active:bg-olive-800",
      )}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}

import { buttonVariants } from "@client/components/ui/button";
import { ArrowLeftIcon, ChevronRightIcon } from "@client/components/ui/icons";
import type { Breadcrumb } from "@client/router";
import { Link, useMatches } from "@tanstack/react-router";
import { cn } from "cn";
import { Suspense } from "react";
import type { Ref } from "react";

const noBreadcrumbs: Breadcrumb[] = [];

// Shows the trail the current page declares in `staticData.breadcrumbs`, plus its actions slot.
export function AppHeader({ actionsRef }: { actionsRef: Ref<HTMLDivElement> }) {
  const breadcrumbs = useMatches({
    select: (matches) => matches.at(-1)?.staticData.breadcrumbs ?? noBreadcrumbs,
  });
  const parents = breadcrumbs.slice(0, -1);
  const current = breadcrumbs.at(-1);
  // On small screens the trail collapses to a link back to the nearest linked parent.
  const back = parents.findLast((breadcrumb) => breadcrumb.link);

  // Installed on iOS 26+, the top edge blurs unless a sticky or fixed element with its own
  // background touches it; this header is that element.

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b-[0.5px] border-black/18 bg-olive-50 pr-[max(1.25rem,env(safe-area-inset-right))] pl-[max(1.25rem,env(safe-area-inset-left))] font-medium max-lg:h-[calc(3rem+env(safe-area-inset-top))] max-lg:pt-[env(safe-area-inset-top)] lg:px-6 dark:border-white/10 dark:bg-olive-925">
      <div className="flex min-w-0 items-center gap-1.5">
        {back?.link && (
          <Link
            className={cn(buttonVariants({ variant: "ghost" }), "-ml-3 lg:hidden")}
            {...back.link}
          >
            <ArrowLeftIcon />
            <BreadcrumbLabel label={back.label} />
          </Link>
        )}
        {parents.length > 0 && (
          <nav aria-label="Breadcrumb" className="hidden min-w-0 lg:block">
            <ol className="flex items-center gap-1.5">
              {parents.map((breadcrumb, index) => (
                // The trail is static per page, so positions are stable keys.
                <li className="flex min-w-0 items-center gap-1.5" key={index}>
                  {breadcrumb.link ? (
                    <Link
                      className="truncate rounded-sm text-olive-500 hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:text-olive-100"
                      {...breadcrumb.link}
                    >
                      <BreadcrumbLabel label={breadcrumb.label} />
                    </Link>
                  ) : (
                    <span className="truncate text-olive-500">
                      <BreadcrumbLabel label={breadcrumb.label} />
                    </span>
                  )}
                  <ChevronRightIcon className="shrink-0 text-olive-400 dark:text-olive-600" />
                </li>
              ))}
            </ol>
          </nav>
        )}
        {current && (
          <h1 className={cn("min-w-0 truncate", back && "hidden lg:block")}>
            <BreadcrumbLabel label={current.label} />
          </h1>
        )}
      </div>
      {/* Fills the rest of the row, so a page can lead its actions with a field beside the heading. */}
      <div className="flex shrink-0 grow items-center justify-end gap-1" ref={actionsRef} />
    </header>
  );
}

function BreadcrumbLabel({ label: Label }: { label: Breadcrumb["label"] }) {
  if (typeof Label === "string") return Label;
  // Component labels may wait for the household store; the rest of the header renders meanwhile.
  return (
    <Suspense>
      <Label />
    </Suspense>
  );
}

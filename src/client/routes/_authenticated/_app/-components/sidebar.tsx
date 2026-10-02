import { Collapsible } from "@base-ui/react/collapsible";
import { CaretUpIcon, SobaLogo, Tag01Icon } from "@client/components/ui/icons";
import { ScrollArea } from "@client/components/ui/scroll-area";
import { householdStoreReady, useHouseholdQuery } from "@client/features/household/store";
import { recipes$, recipeTags$, tags$ } from "@client/features/recipes/queries";
import { topTags } from "@client/features/recipes/recipe-tags";
import { Link } from "@tanstack/react-router";
import { Suspense, use } from "react";
import type { ComponentProps, ReactNode } from "react";

import { AccountMenu } from "./account-menu";
import { desktopNavigation } from "./app-navigation";
import { SidebarLink } from "./sidebar-link";

const tagShortcutCount = 6;

export function Sidebar({
  user,
  household,
}: ComponentProps<typeof AccountMenu> & { household: { id: string } }) {
  return (
    <aside className="hidden min-h-0 flex-col py-1.5 lg:flex">
      <div className="flex h-12 shrink-0 items-center justify-between gap-1.5 pr-3.5 pl-6">
        <Link
          aria-label="Soba"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
          to="/recipes"
        >
          <SobaLogo />
        </Link>
      </div>
      <ScrollArea className="flex-1" scrollFade>
        <div className="grid gap-1 px-1">
          <nav aria-label="Main navigation" className="flex flex-col gap-0.5 p-2">
            {desktopNavigation.map(({ icon: Icon, label, to }) => (
              <SidebarLink key={to} showActiveState to={to}>
                <Icon />
                <span>{label}</span>
              </SidebarLink>
            ))}
          </nav>
          {/* The sidebar renders before the household store opens; shortcuts appear once it has. */}
          <Suspense fallback={null}>
            <TagShortcuts householdId={household.id} />
          </Suspense>
        </div>
      </ScrollArea>
      <div className="grid shrink-0 px-3 py-2">
        <AccountMenu household={household} user={user} />
      </div>
    </aside>
  );
}

// The tags on the most recipes, each opening the recipe list filtered by it.
function TagShortcuts({ householdId }: { householdId: string }) {
  use(householdStoreReady(householdId));
  const recipes = useHouseholdQuery(householdId, recipes$);
  const tags = useHouseholdQuery(householdId, tags$);
  const links = useHouseholdQuery(householdId, recipeTags$);
  const top = topTags(tags, links, new Set(recipes.map(({ id }) => id)), tagShortcutCount);
  if (top.length === 0) return null;

  return (
    <ShortcutSection label="Tag shortcuts" title="Tags">
      {top.map(({ tag, count }) => (
        <SidebarLink key={tag.id} search={{ tags: [tag.id] }} showActiveState to="/recipes">
          <Tag01Icon />
          <span className="truncate">{tag.name}</span>
          <span className="ml-auto text-sm text-olive-500 tabular-nums">{count}</span>
        </SidebarLink>
      ))}
    </ShortcutSection>
  );
}

function ShortcutSection({
  children,
  label,
  title,
}: {
  children: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <nav aria-label={label} className="p-2">
      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger className="group mx-1 flex h-6 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-olive-500 outline-none hover:bg-olive-200 hover:text-olive-800 focus-visible:outline-2 focus-visible:outline-offset-1 dark:hover:bg-olive-900/50 dark:hover:text-olive-200">
          <span>{title}</span>
          <CaretUpIcon className="rotate-90 transition-transform duration-100 group-data-panel-open:rotate-180" />
        </Collapsible.Trigger>
        <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-150 data-ending-style:h-0 data-starting-style:h-0">
          <div className="flex flex-col gap-0.5 pt-2">{children}</div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </nav>
  );
}

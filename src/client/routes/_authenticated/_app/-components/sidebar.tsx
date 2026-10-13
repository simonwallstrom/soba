import { Collapsible } from "@base-ui/react/collapsible";
import {
  CaretUpIcon,
  File02Icon,
  HashtagIcon,
  SobaLogo,
  StarIcon,
} from "@client/components/ui/icons";
import { ScrollArea } from "@client/components/ui/scroll-area";
import { useCookingProgress } from "@client/features/recipes/cooking-session";
import { useFavorites, useRecipes, useTags } from "@client/features/recipes/recipe-data";
import { recipeTagLinks, topTags } from "@client/features/recipes/recipe-tags";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import type { ComponentProps, ReactNode } from "react";

import { AccountMenu } from "./account-menu";
import { desktopNavigation } from "./app-navigation";
import { SidebarLink } from "./sidebar-link";

// Favorites and tags each show this many, to keep the sidebar short.
const shortcutCount = 5;

export function Sidebar({
  household,
  user,
}: {
  user: ComponentProps<typeof AccountMenu>["user"];
  household: ComponentProps<typeof AccountMenu>["household"];
}) {
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
        {/* One column no wider than the sidebar, so long names truncate instead of scrolling. */}
        <div className="grid grid-cols-1 gap-1 px-1">
          {/* Less padding on top centers the first link on the page's toolbar beside it. */}
          <nav aria-label="Main navigation" className="flex flex-col gap-0.5 px-2 pt-1 pb-2">
            {desktopNavigation.map(({ icon: Icon, label, to }) => (
              <SidebarLink key={to} showActiveState to={to}>
                <Icon />
                <span>{label}</span>
              </SidebarLink>
            ))}
          </nav>
          {/* The sidebar renders before the recipes load; shortcuts appear once they have. */}
          <Suspense fallback={null}>
            <CookingShortcuts />
            <FavoriteShortcuts />
            <TagShortcuts />
          </Suspense>
        </div>
      </ScrollArea>
      <div className="grid shrink-0 px-3 py-2">
        <AccountMenu household={household} user={user} />
      </div>
    </aside>
  );
}

// The recipes you're in the middle of cooking in this browser, with the steps done so far.
function CookingShortcuts() {
  const cooking = useCookingProgress(useRecipes());
  if (cooking.length === 0) return null;

  return (
    <ShortcutSection label="Recipes you’re cooking" title="Cooking">
      {cooking.map(({ recipe, doneCount, stepCount }) => (
        <SidebarLink
          key={recipe.id}
          params={{ recipeId: recipe.id }}
          showActiveState
          to="/recipes/$recipeId"
        >
          <File02Icon />
          <span className="truncate">{recipe.title}</span>
          {stepCount > 0 && (
            <span
              aria-label={`${doneCount} of ${stepCount} steps done`}
              className="mr-1 ml-auto text-sm text-olive-500 tabular-nums"
            >
              {doneCount}/{stepCount}
            </span>
          )}
        </SidebarLink>
      ))}
    </ShortcutSection>
  );
}

// Your newest favorite recipes, with a link to the rest in the recipe list. Favorites of deleted
// recipes are left out.
function FavoriteShortcuts() {
  const recipes = useRecipes();
  const { recipeIds } = useFavorites();
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const favorites = recipeIds.flatMap((id) => recipesById.get(id) ?? []);
  if (favorites.length === 0) return null;

  return (
    <ShortcutSection label="Favorite recipes" title="Favorites">
      {favorites.slice(0, shortcutCount).map((recipe) => (
        <SidebarLink
          key={recipe.id}
          params={{ recipeId: recipe.id }}
          showActiveState
          to="/recipes/$recipeId"
        >
          <File02Icon />
          <span className="truncate">{recipe.title}</span>
        </SidebarLink>
      ))}
      {favorites.length > shortcutCount && (
        <SidebarLink search={{ favorites: true }} showActiveState to="/recipes">
          <StarIcon />
          <span className="truncate">All favorites</span>
          <span className="mr-1 ml-auto text-sm text-olive-500 tabular-nums">
            {favorites.length}
          </span>
        </SidebarLink>
      )}
    </ShortcutSection>
  );
}

// The tags on the most recipes, each opening the recipe list filtered by it.
function TagShortcuts() {
  const recipes = useRecipes();
  const tags = useTags();
  const top = topTags(
    tags,
    recipeTagLinks(recipes),
    new Set(recipes.map(({ id }) => id)),
    shortcutCount,
  );
  if (top.length === 0) return null;

  return (
    <ShortcutSection label="Tag shortcuts" title="Tags">
      {top.map(({ tag, count }) => (
        <SidebarLink key={tag.id} search={{ tags: [tag.id] }} showActiveState to="/recipes">
          <HashtagIcon className="mx-px size-3.5" />
          <span className="truncate">{tag.name}</span>
          <span className="mr-1 ml-auto text-sm text-olive-500 tabular-nums">{count}</span>
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

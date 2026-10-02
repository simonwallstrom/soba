import { Search01Icon } from "@client/components/ui/icons";
import { useRequestRecipeSearch } from "@client/features/recipes/search-request";
import { Link } from "@tanstack/react-router";

import { mobileNavigation } from "./app-navigation";

const itemStyles =
  "flex size-11 min-w-0 items-center justify-center rounded-full text-olive-500 outline-none hover:bg-olive-100 hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-offset-1 active:bg-olive-200 dark:hover:bg-olive-900 dark:hover:text-olive-100 dark:active:bg-olive-800 [&.active]:bg-olive-200 [&.active]:text-olive-950 dark:[&.active]:bg-olive-900 dark:[&.active]:text-white";

// Search sits second, after recipes.
const [firstDestination, ...otherDestinations] = mobileNavigation;

export function MobileNav() {
  const requestSearch = useRequestRecipeSearch();

  return (
    <nav
      aria-label="Main navigation"
      className="border-t-[0.5px] border-black/18 bg-white pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] lg:hidden dark:border-white/10 dark:bg-olive-925"
    >
      <div className="flex justify-around px-1 py-2">
        <DestinationLink {...firstDestination} />
        <button aria-label="Search" className={itemStyles} onClick={requestSearch} type="button">
          <Search01Icon className="size-5" />
        </button>
        {otherDestinations.map((destination) => (
          <DestinationLink key={destination.to} {...destination} />
        ))}
      </div>
    </nav>
  );
}

function DestinationLink({ icon: Icon, label, to }: (typeof mobileNavigation)[number]) {
  return (
    <Link aria-label={label} className={itemStyles} to={to}>
      <Icon className="size-5" />
    </Link>
  );
}

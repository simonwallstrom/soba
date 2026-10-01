import { Link } from "@tanstack/react-router";

import { mobileNavigation } from "./app-navigation";

export function MobileNav() {
  return (
    <nav
      aria-label="Main navigation"
      className="border-t-[0.5px] border-black/18 bg-white pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] lg:hidden dark:border-white/10 dark:bg-olive-925"
    >
      <div className="flex justify-around px-1 py-2">
        {mobileNavigation.map(({ icon: Icon, label, to }) => (
          <Link
            aria-label={label}
            className="flex size-11 min-w-0 items-center justify-center rounded-full text-olive-500 outline-none hover:bg-olive-100 hover:text-olive-900 focus-visible:outline-2 focus-visible:outline-offset-1 active:bg-olive-200 dark:hover:bg-olive-900 dark:hover:text-olive-100 dark:active:bg-olive-800 [&.active]:bg-olive-200 [&.active]:text-olive-950 dark:[&.active]:bg-olive-900 dark:[&.active]:text-white"
            key={to}
            to={to}
          >
            <Icon className="size-5" />
          </Link>
        ))}
      </div>
    </nav>
  );
}

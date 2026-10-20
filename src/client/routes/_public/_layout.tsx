import { SobaLogo } from "@client/components/ui/icons";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_public")({ component: PublicLayout });

const footerLinkStyles = "hover:text-olive-900 focus-visible:outline-2 dark:hover:text-olive-200";

// Long reads, like the terms and privacy policy: one comfortable column, with the logo leading
// home and the documents linked below, with home again.
function PublicLayout() {
  return (
    // The document never scrolls (see index.html), so the page scrolls itself.
    <div className="min-h-0 flex-1 overflow-y-auto" data-scroll-restoration-id="public-content">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-12 px-5 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-16">
        <header>
          <Link
            aria-label="Soba"
            className="inline-block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
            to="/"
          >
            <SobaLogo className="w-14 text-olive-900 dark:text-olive-100" />
          </Link>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="flex flex-wrap gap-x-4 gap-y-2 border-t pt-6 text-sm font-medium text-olive-600 dark:text-olive-400">
          <Link className={footerLinkStyles} to="/">
            Home
          </Link>
          <Link className={footerLinkStyles} to="/terms">
            Terms of use
          </Link>
          <Link className={footerLinkStyles} to="/privacy">
            Privacy policy
          </Link>
        </footer>
      </div>
    </div>
  );
}

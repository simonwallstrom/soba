import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_public")({ component: PublicLayout });

function PublicLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <header>
        <Link to="/" className="font-medium">
          Soba
        </Link>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="flex gap-4">
        <Link to="/terms" className="underline">
          Terms
        </Link>
        <Link to="/privacy" className="underline">
          Privacy
        </Link>
      </footer>
    </div>
  );
}

import { Button, buttonVariants } from "@client/components/ui/button";
import { Logout03Icon, UserAdd01Icon } from "@client/components/ui/icons";
import { formatMetaTitle } from "@client/lib/meta";
import { useSignOut } from "@client/lib/use-sign-out";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/settings/")({
  staticData: { breadcrumbs: [{ label: "Settings" }] },
  component: Settings,
});

function Settings() {
  const { user, household } = Route.useRouteContext();
  const { logOut, signingOut, signOutError } = useSignOut();

  return (
    <>
      <title>{formatMetaTitle("Settings")}</title>
      <div className="flex flex-col gap-8 p-5 lg:p-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Account</h2>
          <div>
            <p className="truncate">{user.name}</p>
            <p className="truncate text-sm text-olive-500">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className={buttonVariants()} to="/household">
              <UserAdd01Icon />
              {household.name}
            </Link>
            <Button disabled={signingOut} onClick={() => void logOut()}>
              <Logout03Icon />
              {signingOut ? "Logging out…" : "Log out"}
            </Button>
          </div>
          {signOutError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {signOutError}
            </p>
          )}
        </section>
      </div>
    </>
  );
}

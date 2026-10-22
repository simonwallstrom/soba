import { ConfirmDialog } from "@client/components/particles/confirm-dialog";
import { NotFoundState } from "@client/components/particles/not-found-state";
import { SettingsGroup, settingsRowStyles } from "@client/components/particles/settings-group";
import { Badge } from "@client/components/ui/badge";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { Delete02Icon, MoreHorizontalIcon } from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import { formatMetaTitle } from "@client/lib/meta";
import { queryClient } from "@client/lib/query";
import { sessionOptions } from "@client/lib/session";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { cn } from "cn";
import { useState } from "react";
import type { SubmitEvent } from "react";

import {
  addToBeta,
  betaOptions,
  formatDay,
  isActiveThisWeek,
  listHouseholds,
  removeFromBeta,
  sortUsers,
  usersOptions,
} from "./-admin-data";
import { HouseholdsTable, UsersTable } from "./-components/admin-tables";

// Everyone else sees the same "Page not found" as a wrong link, header included; the server
// answers them 404 too.
function AdminBreadcrumb() {
  const { data } = useQuery(sessionOptions);
  return data?.user?.isAdmin ? "Admin" : "Page not found";
}

export const Route = createFileRoute("/_authenticated/_app/admin/")({
  loader: ({ context }) => {
    if (!context.user.isAdmin) return;
    void queryClient.prefetchQuery(usersOptions);
    void queryClient.prefetchQuery(betaOptions);
  },
  staticData: { breadcrumbs: [{ label: AdminBreadcrumb }] },
  component: Admin,
});

function Admin() {
  const { user } = Route.useRouteContext();
  if (!user.isAdmin) {
    return (
      <NotFoundState
        description="This page doesn’t exist, or the link to it is wrong."
        linkLabel="Go to recipes"
        title="Page not found"
      />
    );
  }
  return <AdminPage adminName={user.name} />;
}

function AdminPage({ adminName }: { adminName: string }) {
  const users = useQuery(usersOptions);
  const beta = useQuery(betaOptions);
  const [email, setEmail] = useState("");
  // Kept after the dialog closes, so its text doesn't change while it animates out.
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const sortedUsers = users.data && sortUsers(users.data);
  const households = users.data && listHouseholds(users.data);
  const signedUpEmails = new Set(users.data?.map((entry) => entry.email));
  const stats = users.data && [
    { label: "Users", value: users.data.length },
    { label: "Households", value: households?.length ?? 0 },
    {
      label: "Active this week",
      value: users.data.filter((entry) => isActiveThisWeek(entry)).length,
    },
    {
      label: "Waiting to sign up",
      value: beta.data?.filter((entry) => !signedUpEmails.has(entry.email)).length ?? "–",
    },
  ];

  function handleAdd(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    void addToBeta(email, adminName);
    setEmail("");
  }

  return (
    <>
      <title>{formatMetaTitle("Admin")}</title>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-5 sm:gap-12 sm:py-16 md:px-6 xl:py-20">
        {stats && (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(({ label, value }) => (
              <div
                className="flex flex-col-reverse gap-1 rounded-xl border bg-white p-3 dark:bg-white/3"
                key={label}
              >
                <dt className="text-sm text-olive-500">{label}</dt>
                <dd className="text-2xl font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <SettingsGroup note="Most recently active first." title="Households">
          {users.isError && !users.data && (
            <p className={cn(settingsRowStyles, "text-olive-500")} role="alert">
              Could not load households. Check your connection.
            </p>
          )}
          {users.isPending && (
            <p className={cn(settingsRowStyles, "text-olive-500")}>Loading households…</p>
          )}
          {households && <HouseholdsTable households={households} />}
        </SettingsGroup>

        <SettingsGroup
          note="Most recently active first. Activity is updated at most once a day."
          title="Users"
        >
          {users.isError && !users.data && (
            <p className={cn(settingsRowStyles, "text-olive-500")} role="alert">
              Could not load users. Check your connection.
            </p>
          )}
          {users.isPending && (
            <p className={cn(settingsRowStyles, "text-olive-500")}>Loading users…</p>
          )}
          {sortedUsers && <UsersTable users={sortedUsers} />}
        </SettingsGroup>

        <SettingsGroup
          id="beta"
          note="These emails can sign up and create a household. Removing one stops only new sign-ups. Anyone invited to a household can join without being here."
          title="Beta access"
        >
          <form className={cn(settingsRowStyles, "gap-2")} onSubmit={handleAdd}>
            <Input
              aria-label="Email"
              autoComplete="off"
              enterKeyHint="done"
              onChange={(event) => setEmail(event.currentTarget.value)}
              placeholder="name@example.com"
              required
              type="email"
              value={email}
            />
            <Button disabled={!email.trim()} type="submit" variant="primary">
              Add
            </Button>
          </form>
          {beta.isError && !beta.data && (
            <p className={cn(settingsRowStyles, "text-olive-500")} role="alert">
              Could not load the list. Check your connection.
            </p>
          )}
          {beta.data?.map((entry) => (
            <div className={settingsRowStyles} key={entry.email}>
              <div className="min-w-0 flex-1">
                <p className="truncate leading-5 font-medium">{entry.email}</p>
                <p className="truncate text-sm text-olive-500">
                  {entry.admin
                    ? "Set in the ADMIN_EMAILS secret, so it can’t be removed here"
                    : [
                        entry.signedUpAt
                          ? `Signed up ${formatDay(entry.signedUpAt)}`
                          : "Not signed up yet",
                        entry.addedAt &&
                          `added ${formatDay(entry.addedAt)}${entry.addedByName ? ` by ${entry.addedByName}` : ""}`,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                </p>
              </div>
              {entry.admin ? (
                <Badge variant="primary">Admin</Badge>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`More actions for ${entry.email}`}
                    className={buttonVariants({
                      className: "-mr-2",
                      size: "icon",
                      variant: "ghost",
                    })}
                  >
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-52">
                    <DropdownMenuItem
                      onClick={() => {
                        setRemoving(entry.email);
                        setConfirmingRemove(true);
                      }}
                      variant="destructive"
                    >
                      <Delete02Icon />
                      Remove from beta…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </SettingsGroup>
      </div>

      <ConfirmDialog
        action="Remove"
        description={
          removing && signedUpEmails.has(removing)
            ? "They keep their account. Removing an email only stops new sign-ups."
            : "They can no longer sign up unless someone invites them to a household."
        }
        onConfirm={() => {
          if (removing) void removeFromBeta(removing);
        }}
        onOpenChange={setConfirmingRemove}
        open={confirmingRemove}
        title={`Remove ${removing ?? ""} from the beta?`}
      />
    </>
  );
}

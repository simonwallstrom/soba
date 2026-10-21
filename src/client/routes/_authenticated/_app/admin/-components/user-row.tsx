import { Avatar, AvatarFallback, AvatarImage } from "@client/components/ui/avatar";
import { Badge } from "@client/components/ui/badge";
import { getInitials } from "@client/features/household/members";
import { cn } from "cn";

import { formatDay } from "../-admin-data";
import type { AdminUser } from "../-admin-data";

// One grid for the header and every row, so the columns line up. On phones a row stacks instead:
// the user and when they were last active, then a line each for the household and the counts.
const columns =
  "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_repeat(4,4.5rem)_6.5rem] lg:items-center";
const numberStyles = "hidden text-right tabular-nums lg:block";

export function UserTableHeader() {
  return (
    <div
      aria-hidden="true"
      className={cn("hidden gap-x-3 px-3 py-2 text-sm text-olive-500 lg:grid", columns)}
    >
      <span>User</span>
      <span>Household</span>
      <span className="text-right">Recipes</span>
      <span className="text-right">Planned</span>
      <span className="text-right">AI</span>
      <span className="text-right">Setup</span>
      <span className="text-right">Active</span>
    </div>
  );
}

export function UserRow({ user }: { user: AdminUser }) {
  const { household } = user;
  const day = user.lastActiveAt ? formatDay(user.lastActiveAt) : "never";
  const active = day.charAt(0).toUpperCase() + day.slice(1);
  const signedUp = `Signed up ${formatDay(user.signedUpAt)}`;

  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 p-3", columns)}>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar>
          {user.image && <AvatarImage alt="" referrerPolicy="no-referrer" src={user.image} />}
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate leading-4 font-medium">{user.name}</p>
          <p className="truncate text-sm text-olive-500">{user.email}</p>
        </div>
      </div>

      {/* Beside the user on phones, last on wider screens. */}
      <span
        className="text-right text-sm text-olive-500 max-lg:col-start-2 max-lg:row-start-1 lg:order-last lg:text-base lg:text-inherit"
        title={signedUp}
      >
        {active}
      </span>

      <div className="min-w-0 max-lg:col-span-2 max-lg:pl-11">
        {household ? (
          <>
            <p className="flex min-w-0 items-center gap-1.5 leading-5">
              <span className="truncate">{household.name}</span>
              {household.role === "owner" && <Badge>Owner</Badge>}
            </p>
            <p className="truncate text-sm text-olive-500">
              {household.members === 1 ? "1 member" : `${household.members} members`}
            </p>
          </>
        ) : (
          <p className="text-olive-500">No household</p>
        )}
      </div>

      {/* The counts, in columns on wider screens and as one line on phones. */}
      <span className={numberStyles}>{household?.recipes ?? "–"}</span>
      <span
        className={numberStyles}
        title={household?.lastMealDate ? `Latest planned: ${household.lastMealDate}` : undefined}
      >
        {household?.plannedMeals ?? "–"}
      </span>
      <span className={numberStyles}>{user.assistants || "–"}</span>
      <span className={numberStyles}>
        {household ? `${household.checklist.done}/${household.checklist.total}` : "–"}
      </span>
      {household && (
        <p className="col-span-2 truncate pl-11 text-sm text-olive-500 lg:hidden">
          {[
            `${household.recipes} recipes`,
            `${household.plannedMeals} planned`,
            user.assistants > 0 && `${user.assistants} AI`,
            `Setup ${household.checklist.done}/${household.checklist.total}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

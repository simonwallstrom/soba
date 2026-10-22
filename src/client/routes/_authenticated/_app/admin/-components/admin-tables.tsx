import { Avatar, AvatarFallback, AvatarImage } from "@client/components/ui/avatar";
import { Badge } from "@client/components/ui/badge";
import { getInitials } from "@client/features/household/members";
import { cn } from "cn";
import type { ReactNode } from "react";

import { formatDay } from "../-admin-data";
import type { AdminHousehold, AdminUser } from "../-admin-data";

// Admin is mostly used on a computer, so on phones a table keeps its columns and scrolls sideways.
function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-176 text-left whitespace-nowrap">
        <thead className="text-sm text-olive-500">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y border-t">{children}</tbody>
      </table>
    </div>
  );
}

const cellStyles = "px-3 py-2.5 first:pl-3 last:pr-3";
const numberStyles = "text-right tabular-nums";

function Th({ children, number = false }: { children: ReactNode; number?: boolean }) {
  return (
    <th className={cn(cellStyles, "py-2 font-normal", number && "text-right")} scope="col">
      {children}
    </th>
  );
}

// "Today", "6 days ago", or "Never" for someone who hasn't been back since signing up.
function Active({ at, title }: { at: string | null; title?: string }) {
  const day = at ? formatDay(at) : "never";
  return (
    <td className={cn(cellStyles, "text-right text-olive-600 dark:text-olive-400")} title={title}>
      {day.charAt(0).toUpperCase() + day.slice(1)}
    </td>
  );
}

export function HouseholdsTable({ households }: { households: AdminHousehold[] }) {
  return (
    <Table
      head={
        <>
          <Th>Household</Th>
          <Th>Owner</Th>
          <Th number>Members</Th>
          <Th number>Recipes</Th>
          <Th number>Planned</Th>
          <Th number>Active</Th>
        </>
      }
    >
      {households.map((household) => (
        <tr key={household.id}>
          <td className={cn(cellStyles, "font-medium")}>{household.name}</td>
          <td className={cellStyles}>{household.ownerName ?? "–"}</td>
          <td className={cn(cellStyles, numberStyles)}>{household.members}</td>
          <td className={cn(cellStyles, numberStyles)}>{household.recipes}</td>
          <td
            className={cn(cellStyles, numberStyles)}
            title={household.lastMealDate ? `Latest planned: ${household.lastMealDate}` : undefined}
          >
            {household.plannedMeals}
          </td>
          <Active at={household.lastActiveAt} />
        </tr>
      ))}
    </Table>
  );
}

function UserIdentity({ user }: { user: AdminUser }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        {user.image && <AvatarImage alt="" referrerPolicy="no-referrer" src={user.image} />}
        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <div>
        <p className="flex items-center gap-1.5 leading-5 font-medium">
          {user.name}
          {user.household?.role === "owner" && <Badge>Owner</Badge>}
        </p>
        <p className="text-sm text-olive-500">{user.email}</p>
      </div>
    </div>
  );
}

export function UsersTable({ users }: { users: AdminUser[] }) {
  return (
    <Table
      head={
        <>
          <Th>User</Th>
          <Th>Household</Th>
          <Th number>Recipes</Th>
          <Th number>Setup</Th>
          <Th number>AI</Th>
          <Th number>Active</Th>
        </>
      }
    >
      {users.map((user) => (
        <tr key={user.id}>
          <td className={cellStyles}>
            <UserIdentity user={user} />
          </td>
          <td className={cn(cellStyles, !user.household && "text-olive-500")}>
            {user.household?.name ?? "No household"}
          </td>
          <td className={cn(cellStyles, numberStyles)}>{user.recipes}</td>
          <td className={cn(cellStyles, numberStyles)}>
            {user.household
              ? `${user.household.checklist.done}/${user.household.checklist.total}`
              : "–"}
          </td>
          <td className={cn(cellStyles, numberStyles)}>{user.assistants || "–"}</td>
          <Active at={user.lastActiveAt} title={`Signed up ${formatDay(user.signedUpAt)}`} />
        </tr>
      ))}
    </Table>
  );
}

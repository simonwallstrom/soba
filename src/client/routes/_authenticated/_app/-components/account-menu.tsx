import { Avatar, AvatarFallback } from "@client/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import {
  LegalDocument01Icon,
  Logout03Icon,
  SelectorIcon,
  Settings01Icon,
  UserAdd01Icon,
} from "@client/components/ui/icons";
import { signOut } from "@client/lib/auth";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { useState } from "react";

import { destinations } from "./app-navigation";
import { sidebarItemStyles } from "./sidebar-link";

function getInitials(name: string) {
  return name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AccountMenu({
  user,
  household,
}: {
  user: { name: string };
  household: { name: string };
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function logOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      await signOut();
    } catch {
      setSignOutError("Could not log out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          sidebarItemStyles,
          "min-w-0 data-popup-open:bg-olive-300/50 data-popup-open:text-inherit dark:data-popup-open:bg-olive-900 data-popup-open:[&_svg]:opacity-100",
        )}
      >
        <Avatar className="-ml-0.5" size="sm">
          <AvatarFallback
            aria-hidden="true"
            className="bg-olive-800 text-[10px] text-olive-50 dark:bg-olive-200 dark:text-olive-950"
          >
            {household.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="-ml-0.5 min-w-0 flex-1 truncate text-left">{household.name}</span>
        <SelectorIcon className="ml-auto" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        alignOffset={-4.5}
        className="w-64"
        side="right"
        sideOffset={8}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 text-base font-normal">
            <Avatar>
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate leading-4 font-medium text-olive-900 dark:text-olive-200">
                {user.name}
              </span>
              <span className="block truncate text-sm leading-4 text-olive-500">
                {household.name}
              </span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/household" />}>
            <UserAdd01Icon />
            Invite member
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to={destinations.settings.to} />}>
            <Settings01Icon />
            {destinations.settings.label}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/terms" />}>
            <LegalDocument01Icon />
            Terms &amp; privacy
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem closeOnClick={false} disabled={signingOut} onClick={() => void logOut()}>
          <Logout03Icon />
          {signingOut ? "Logging out…" : "Log out"}
        </DropdownMenuItem>
        {signOutError && (
          <p className="px-2 pt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {signOutError}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

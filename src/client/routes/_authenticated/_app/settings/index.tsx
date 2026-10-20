import { Avatar, AvatarFallback, AvatarImage } from "@client/components/ui/avatar";
import { Badge } from "@client/components/ui/badge";
import { buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { Delete02Icon, Logout03Icon, MoreHorizontalIcon } from "@client/components/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import { connectionsOptions } from "@client/features/assistants/connections";
import { getInitials, householdOptions } from "@client/features/household/members";
import type { HouseholdMember } from "@client/features/household/members";
import { api } from "@client/lib/api";
import { formatMetaTitle } from "@client/lib/meta";
import { queryClient } from "@client/lib/query";
import { invalidateSession } from "@client/lib/session";
import { useSignOut } from "@client/lib/use-sign-out";
import { householdLanguages, householdUnits } from "@shared/household";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { cn } from "cn";
import { Suspense, useState } from "react";

import { AssistantsGroup } from "./-components/assistants-group";
import { ConfirmDialog } from "./-components/confirm-dialog";
import { EditableTextRow } from "./-components/editable-text-row";
import { InviteLinkRow } from "./-components/invite-link-row";
import { ProfileRow } from "./-components/profile-row";
import {
  SettingsField,
  SettingsGroup,
  SettingsRowIcon,
  settingsButtonRowStyles,
  settingsRowStyles,
} from "./-components/settings-group";
import { TagsGroup } from "./-components/tags-group";
import { TimeZoneField } from "./-components/time-zone-field";
import { renameUser, sendHouseholdRequest, updateHousehold } from "./-settings-requests";

export const Route = createFileRoute("/_authenticated/_app/settings/")({
  // Starts the members and assistants requests without blocking navigation.
  loader: () => {
    void queryClient.prefetchQuery(householdOptions);
    void queryClient.prefetchQuery(connectionsOptions);
  },
  staticData: { breadcrumbs: [{ label: "Settings" }] },
  component: Settings,
});

async function refreshMembers() {
  await queryClient.invalidateQueries({ queryKey: householdOptions.queryKey });
}

async function removeMember(member: HouseholdMember) {
  const removed = await sendHouseholdRequest(() =>
    api.household.members[":userId"].$delete({ param: { userId: member.id } }),
  );
  if (removed) await refreshMembers();
}

function Settings() {
  const { user, household } = Route.useRouteContext();
  const { data, isError } = useQuery(householdOptions);
  const { logOut, signingOut, signOutError } = useSignOut();
  // Kept after the dialog closes, so its text doesn't change while it animates out.
  const [removing, setRemoving] = useState<HouseholdMember | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (!household) return null;
  const isOwner = household.role === "owner";
  const hasOtherMembers = data?.members.some((member) => member.id !== user.id) ?? false;

  async function leave() {
    setLeaving(true);
    // The authenticated layout clears local data and redirects once the session changes.
    if (await sendHouseholdRequest(() => api.household.leave.$post())) await invalidateSession();
    else setLeaving(false);
  }

  return (
    <>
      <title>{formatMetaTitle("Settings")}</title>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-5 sm:gap-12 sm:py-16 md:px-6 xl:py-20">
        <SettingsGroup note="How you appear to your household." title="Profile">
          <ProfileRow onRename={(name) => void renameUser(name)} user={user} />
          <button
            className={cn(settingsButtonRowStyles)}
            disabled={signingOut}
            onClick={() => void logOut()}
            type="button"
          >
            <SettingsRowIcon>
              <Logout03Icon />
            </SettingsRowIcon>
            {signingOut ? "Logging out…" : "Log out"}
          </button>
          {signOutError && (
            <p
              className={cn(settingsRowStyles, "text-sm text-red-600 dark:text-red-400")}
              role="alert"
            >
              {signOutError}
            </p>
          )}
        </SettingsGroup>

        <AssistantsGroup />

        <SettingsGroup
          note="The app and imported recipes use this language and these units."
          title="Household"
        >
          <EditableTextRow
            canEdit={isOwner}
            id="household-name"
            label="Name"
            onSave={(name) =>
              void updateHousehold({ name }, () => api.household.name.$put({ json: { name } }))
            }
            value={household.name}
          />
          <SettingsField htmlFor="household-language" label="Language">
            <Select
              items={householdLanguages}
              onValueChange={(language) => {
                if (!language) return;
                const settings = { language, units: household.units, timeZone: household.timeZone };
                void updateHousehold(settings, () =>
                  api.household.settings.$put({ json: settings }),
                );
              }}
              value={household.language}
            >
              <SelectTrigger className="sm:w-52" id="household-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {householdLanguages.map((language) => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField htmlFor="household-units" label="Units">
            <Select
              items={householdUnits}
              onValueChange={(units) => {
                if (!units) return;
                const settings = {
                  language: household.language,
                  units,
                  timeZone: household.timeZone,
                };
                void updateHousehold(settings, () =>
                  api.household.settings.$put({ json: settings }),
                );
              }}
              value={household.units}
            >
              <SelectTrigger className="sm:w-52" id="household-units">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {householdUnits.map((units) => (
                  <SelectItem key={units.value} value={units.value}>
                    {units.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField htmlFor="household-time-zone" label="Time zone">
            <TimeZoneField
              id="household-time-zone"
              onChange={(timeZone) => {
                const settings = { language: household.language, units: household.units, timeZone };
                void updateHousehold(settings, () =>
                  api.household.settings.$put({ json: settings }),
                );
              }}
              value={household.timeZone}
            />
          </SettingsField>
        </SettingsGroup>

        <SettingsGroup
          id="members"
          note="Everyone here shares the recipes and meal plan."
          title="Members"
        >
          {isError && !data && (
            <p className={cn(settingsRowStyles, "text-olive-500")} role="alert">
              Could not load members. Check your connection.
            </p>
          )}
          {!data && !isError && (
            <p className={cn(settingsRowStyles, "text-olive-500")}>Loading members…</p>
          )}
          {data?.members.map((member) => (
            <div className={settingsRowStyles} key={member.id}>
              <Avatar>
                {member.image && (
                  <AvatarImage alt="" referrerPolicy="no-referrer" src={member.image} />
                )}
                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate leading-4 font-medium">
                  {member.name}
                  {member.id === user.id && <span className="text-olive-500"> (you)</span>}
                </p>
                <p className="truncate text-sm text-olive-500">{member.email}</p>
              </div>
              {member.role === "owner" ? (
                <Badge variant="primary">Owner</Badge>
              ) : (
                <Badge>Member</Badge>
              )}
              {isOwner && member.role !== "owner" && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`More actions for ${member.name}`}
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
                        setRemoving(member);
                        setConfirmingRemove(true);
                      }}
                      variant="destructive"
                    >
                      <Delete02Icon />
                      Remove from household…
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
          {isOwner && (
            <InviteLinkRow
              inviteUrl={data?.inviteUrl}
              onSwitch={async (on) => {
                const switched = await sendHouseholdRequest(() =>
                  on ? api.household.invite.$post() : api.household.invite.$delete(),
                );
                if (switched) await refreshMembers();
              }}
            />
          )}
        </SettingsGroup>

        {/* Tags come with the recipes, which may still be loading. */}
        <Suspense fallback={null}>
          <TagsGroup />
        </Suspense>

        <SettingsGroup
          note={
            isOwner
              ? hasOtherMembers
                ? "Remove the other members first. Deleting removes all recipes and the meal plan."
                : "Removes all recipes and the meal plan. This can't be undone."
              : "You can join again with a new invite link."
          }
          title={isOwner ? "Delete household" : "Leave household"}
        >
          <button
            className={cn(settingsButtonRowStyles, "text-red-600 dark:text-red-400")}
            disabled={leaving || (isOwner && (!data || hasOtherMembers))}
            onClick={() => setConfirmingLeave(true)}
            type="button"
          >
            <SettingsRowIcon>{isOwner ? <Delete02Icon /> : <Logout03Icon />}</SettingsRowIcon>
            {leaving
              ? isOwner
                ? "Deleting…"
                : "Leaving…"
              : isOwner
                ? "Delete household…"
                : "Leave household…"}
          </button>
        </SettingsGroup>
      </div>

      <ConfirmDialog
        action="Remove"
        description="They lose access to its recipes and meal plan. You can invite them again later."
        onConfirm={() => {
          if (removing) void removeMember(removing);
        }}
        onOpenChange={setConfirmingRemove}
        open={confirmingRemove}
        title={`Remove ${removing?.name ?? ""} from ${household.name}?`}
      />

      <ConfirmDialog
        action={isOwner ? "Delete household" : "Leave"}
        description={
          isOwner
            ? "All of its recipes and its meal plan are deleted. This can't be undone."
            : "You lose access to its recipes and meal plan until someone invites you again."
        }
        onConfirm={() => void leave()}
        onOpenChange={setConfirmingLeave}
        open={confirmingLeave}
        title={isOwner ? `Delete ${household.name}?` : `Leave ${household.name}?`}
      />
    </>
  );
}

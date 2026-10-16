import { WelcomeHeader, WelcomeLayout } from "@client/components/particles/welcome-layout";
import { Button } from "@client/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@client/components/ui/field";
import { CheckIcon, Copy01Icon } from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import { householdOptions } from "@client/features/household/members";
import { api } from "@client/lib/api";
import { signOut } from "@client/lib/auth";
import { formatMetaTitle } from "@client/lib/meta";
import { queryClient } from "@client/lib/query";
import { invalidateSession } from "@client/lib/session";
import {
  defaultHouseholdLanguage,
  defaultHouseholdUnits,
  householdLanguages,
  householdUnits,
} from "@shared/household";
import type { HouseholdLanguage } from "@shared/household";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import * as v from "valibot";

// Creating a household takes two steps: naming it, then inviting the family. `?step=invite` is
// the second, once the household exists.
export const Route = createFileRoute("/_authenticated/onboarding")({
  validateSearch: v.object({ step: v.optional(v.picklist(["invite"])) }),
  beforeLoad: ({ context, search }) => {
    if (context.household && search.step !== "invite") {
      throw redirect({ to: "/recipes", replace: true });
    }
    if (!context.household && search.step === "invite") {
      throw redirect({ to: "/onboarding", replace: true });
    }
  },
  component: Onboarding,
});

function Onboarding() {
  const { user, household, canCreateHousehold } = Route.useRouteContext();
  const [error, setError] = useState("");

  async function logOut() {
    try {
      await signOut();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not log out");
    }
  }

  // A way out, for someone logged in with the wrong account.
  const footer = (
    <>
      Logged in as {user.email} ·{" "}
      <button
        className="underline underline-offset-2 hover:text-olive-800 dark:hover:text-olive-200"
        onClick={() => void logOut()}
        type="button"
      >
        Log out
      </button>
      {error && (
        <p className="mt-2 text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </>
  );

  if (household) {
    return (
      <>
        <title>{formatMetaTitle("Invite your family")}</title>
        <WelcomeLayout>
          <InviteStep householdName={household.name} />
        </WelcomeLayout>
      </>
    );
  }

  if (!canCreateHousehold) {
    return (
      <>
        <title>{formatMetaTitle("Join a household")}</title>
        <WelcomeLayout footer={footer}>
          <WelcomeHeader
            description="Ask someone in your household to share their invite link with you, then open it to join."
            title="Join your household"
          />
        </WelcomeLayout>
      </>
    );
  }

  return (
    <>
      <title>{formatMetaTitle("Create household")}</title>
      <WelcomeLayout footer={footer}>
        <NameStep userName={user.name} />
      </WelcomeLayout>
    </>
  );
}

// "Familjen Wallström" or "The Wallström family", from the account's last name. Empty for a
// one-word name, which makes a poor household name on its own.
function suggestedName(userName: string, language: HouseholdLanguage) {
  const names = userName.trim().split(/\s+/u);
  const lastName = names.length > 1 ? names.at(-1) : undefined;
  if (!lastName) return "";
  return language === "sv" ? `Familjen ${lastName}` : `The ${lastName} family`;
}

// Step 1: the household's name, suggested from the account's, and the language and units that
// imported recipes are translated and converted to. Both start from the browser's locale.
function NameStep({ userName }: { userName: string }) {
  const router = useRouter();
  const [language, setLanguage] = useState(() => defaultHouseholdLanguage(navigator.languages));
  const [units, setUnits] = useState(() => defaultHouseholdUnits(navigator.languages));
  // Null until edited, so the suggestion follows the language until then.
  const [editedName, setEditedName] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const name = editedName ?? suggestedName(userName, language);
  const firstName = userName.trim().split(/\s+/u)[0];

  async function createHousehold(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreating(true);
    try {
      const response = await api.household.$post({
        json: {
          name,
          language,
          units,
          // Not asked for here; Settings shows it, for anyone who signs up away from home.
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      if (!response.ok) {
        const result = await response.json();
        setError("error" in result ? result.error : "Could not create household");
        setCreating(false);
        return;
      }
    } catch {
      setError("Could not reach Soba. Check your connection and try again.");
      setCreating(false);
      return;
    }
    await invalidateSession();
    await router.navigate({ to: "/onboarding", search: { step: "invite" }, replace: true });
  }

  return (
    <>
      <WelcomeHeader
        description="Start by naming your household. Everyone you invite shares its recipes and meal plan."
        eyebrow="Step 1 of 2"
        title={firstName ? `Welcome to Soba, ${firstName}` : "Welcome to Soba"}
      />
      <form className="flex flex-col gap-6" onSubmit={(event) => void createHousehold(event)}>
        <Field>
          <FieldLabel htmlFor="household-name">Household name</FieldLabel>
          <Input
            aria-invalid={error ? true : undefined}
            id="household-name"
            maxLength={80}
            onChange={(event) => {
              setError("");
              setEditedName(event.currentTarget.value);
            }}
            placeholder="Familjen Andersson"
            required
            value={name}
          />
          {error && <FieldError>{error}</FieldError>}
        </Field>

        {/* Shown, not tucked away: the browser's locale is only a guess, and imports depend on it. */}
        <Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="household-language">Language</FieldLabel>
              <Select
                items={householdLanguages}
                onValueChange={(next) => next && setLanguage(next)}
                value={language}
              >
                <SelectTrigger id="household-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {householdLanguages.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="household-units">Units</FieldLabel>
              <Select
                items={householdUnits}
                onValueChange={(next) => next && setUnits(next)}
                value={units}
              >
                <SelectTrigger id="household-units">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {householdUnits.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <FieldDescription>
            Imported recipes are translated and converted to these.
          </FieldDescription>
        </Field>

        <Button
          className="mt-1"
          disabled={creating || !name.trim()}
          type="submit"
          variant="primary"
        >
          {creating ? "Creating…" : "Continue"}
        </Button>
      </form>
    </>
  );
}

// Step 2: the household's invite link, which is on from the start, to copy or share. Members
// can be invited later from Settings, so continuing doesn't need it.
function InviteStep({ householdName }: { householdName: string }) {
  const router = useRouter();
  const { data } = useQuery(householdOptions);
  const inviteUrl = data?.inviteUrl ?? null;
  const isLinkOff = data !== undefined && inviteUrl === null;

  // A new household's link is on, but this step may be reached again after switching it off.
  useEffect(() => {
    if (!isLinkOff) return;
    void api.household.invite
      .$post()
      .then(() => queryClient.invalidateQueries({ queryKey: householdOptions.queryKey }));
  }, [isLinkOff]);
  const [copied, setCopied] = useState(false);
  // Phones share straight to Messages or WhatsApp; desktops copy.
  const canShare =
    typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches;

  async function copy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (!inviteUrl) return;
    try {
      await navigator.share({ title: `Join ${householdName} on Soba`, url: inviteUrl });
    } catch {
      // Closing the share sheet rejects; there's nothing to do.
    }
  }

  return (
    <>
      <WelcomeHeader
        description={`Anyone with this link can log in with Google and join ${householdName}.`}
        eyebrow="Step 2 of 2"
        title="Invite your family"
      />
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            aria-label="Invite link"
            onFocus={(event) => event.currentTarget.select()}
            placeholder="Creating link…"
            readOnly
            value={inviteUrl ?? ""}
          />
          {canShare ? (
            <Button className="shrink-0" disabled={!inviteUrl} onClick={() => void share()}>
              Share
            </Button>
          ) : (
            // Just the icon, which turns to a check, so the field keeps its width.
            <Button
              aria-label={copied ? "Copied" : "Copy link"}
              className="shrink-0 rounded-lg"
              disabled={!inviteUrl}
              onClick={() => void copy()}
              size="icon"
            >
              {copied ? <CheckIcon /> : <Copy01Icon />}
            </Button>
          )}
        </div>
        <p className="text-sm text-olive-500 dark:text-olive-400">
          You can invite people later from Settings.
        </p>
      </div>
      <Button
        onClick={() => void router.navigate({ to: "/recipes", replace: true })}
        variant="primary"
      >
        Continue
      </Button>
    </>
  );
}

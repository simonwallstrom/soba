import { Button } from "@client/components/ui/button";
import { CheckIcon, Copy01Icon, UserAdd01Icon } from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import { Switch } from "@client/components/ui/switch";
import { cn } from "cn";
import { useState } from "react";

import { SettingsRowIcon, settingsRowStyles } from "./settings-group";

// The household's invite link, switched on while family members are joining. Switching it off
// deletes the link, and switching it on or resetting makes a new one, so old links stop working.
export function InviteLinkRow({
  inviteUrl,
  onSwitch,
}: {
  // Undefined until the household loads.
  inviteUrl: string | null | undefined;
  onSwitch: (on: boolean) => Promise<void>;
}) {
  const [pending, setPending] = useState<"on" | "off" | "reset" | null>(null);
  // Briefly confirms a reset, since the new link looks much like the old one.
  const [justReset, setJustReset] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOn = pending === "on" || pending === "reset" || (pending === null && Boolean(inviteUrl));
  const loaded = inviteUrl !== undefined;

  async function change(next: "on" | "off" | "reset") {
    setPending(next);
    setCopied(false);
    setJustReset(false);
    await onSwitch(next !== "off");
    setPending(null);
    if (next === "reset") {
      setJustReset(true);
      setTimeout(() => setJustReset(false), 3000);
    }
  }

  async function copy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn(settingsRowStyles, "items-start")}>
      {/* As tall as the title and its description, so the icon centers beside them. Its circle
          matches a member's avatar fallback, so it reads as the next member in the list. */}
      <SettingsRowIcon className="h-10">
        <span className="flex size-8 items-center justify-center rounded-full bg-olive-200 text-olive-600 dark:bg-olive-800 dark:text-olive-400 [&_svg]:size-4">
          <UserAdd01Icon />
        </span>
      </SettingsRowIcon>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <label className="font-medium" htmlFor="invite-link-switch">
              Invite link
            </label>
            <p className="text-sm text-olive-500">Let family members join with a link.</p>
          </div>
          <Switch
            checked={isOn}
            disabled={!loaded || pending !== null}
            id="invite-link-switch"
            onCheckedChange={(on) => void change(on ? "on" : "off")}
          />
        </div>

        {isOn && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                aria-label="Invite link"
                onFocus={(event) => event.currentTarget.select()}
                placeholder="Creating link…"
                readOnly
                value={pending ? "" : (inviteUrl ?? "")}
              />
              {/* Just the icon, which turns to a check, so the field keeps its width. */}
              <Button
                aria-label={copied ? "Copied" : "Copy link"}
                className="shrink-0 rounded-lg"
                disabled={!inviteUrl || pending !== null}
                onClick={() => void copy()}
                size="icon"
              >
                {copied ? <CheckIcon /> : <Copy01Icon />}
              </Button>
            </div>
            {justReset ? (
              <output className="text-sm text-olive-500">
                Link reset. The old one no longer works.
              </output>
            ) : (
              <p className="text-sm text-olive-500">
                Anyone with the link can log in with Google and join. If it’s been shared too
                widely,{" "}
                <button
                  className="underline underline-offset-2 hover:text-olive-700 disabled:pointer-events-none dark:hover:text-olive-300"
                  disabled={pending !== null}
                  onClick={() => void change("reset")}
                  type="button"
                >
                  {pending === "reset" ? "resetting…" : "reset it"}
                </button>
                .
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

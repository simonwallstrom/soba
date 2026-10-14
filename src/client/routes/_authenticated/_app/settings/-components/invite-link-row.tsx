import { Button } from "@client/components/ui/button";
import { CheckIcon, Copy01Icon, UserAdd01Icon } from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import { Switch } from "@client/components/ui/switch";
import { cn } from "cn";
import { useEffect, useRef, useState } from "react";

import { SettingsRowIcon, settingsRowStyles } from "./settings-group";

// The household's invite link, switched on while family members are joining. Switching it off
// deletes the link, and switching it on or resetting makes a new one, so old links stop working.
export function InviteLinkRow({
  inviteUrl,
  onRequestHandled,
  onSwitch,
  requested,
}: {
  // Undefined until the household loads.
  inviteUrl: string | null | undefined;
  onRequestHandled: () => void;
  onSwitch: (on: boolean) => Promise<void>;
  // Set when the account menu's "Invite member" led here: the link is switched on and shown.
  requested: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!requested || !loaded) return;
    rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    if (!inviteUrl) void change("on");
    onRequestHandled();
    // Runs once per request, after the household loads.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [requested, loaded]);

  return (
    <div className={cn(settingsRowStyles, "items-start")} ref={rowRef}>
      {/* As tall as the title and its description, so the icon centers beside them. */}
      <SettingsRowIcon className="h-10">
        <UserAdd01Icon />
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
            <div className="flex gap-2 max-sm:flex-col">
              <Input
                aria-label="Invite link"
                onFocus={(event) => event.currentTarget.select()}
                placeholder="Creating link…"
                readOnly
                value={pending ? "" : (inviteUrl ?? "")}
              />
              <Button
                className="shrink-0"
                disabled={!inviteUrl || pending !== null}
                onClick={() => void copy()}
              >
                {copied ? <CheckIcon /> : <Copy01Icon />}
                {copied ? "Copied" : "Copy link"}
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

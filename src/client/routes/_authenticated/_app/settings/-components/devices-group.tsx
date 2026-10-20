import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import {
  LaptopIcon,
  Logout03Icon,
  SmartPhone01Icon,
  Tablet01Icon,
} from "@client/components/ui/icons";
import { toast } from "@client/components/ui/toast";
import { api } from "@client/lib/api";
import { queryClient } from "@client/lib/query";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import type { InferResponseType } from "hono/client";
import { useState } from "react";

import { ConfirmDialog } from "./confirm-dialog";
import { describeActivity, describeDevice } from "./describe-device";
import {
  SettingsGroup,
  SettingsRowIcon,
  settingsButtonRowStyles,
  settingsRowStyles,
} from "./settings-group";

export const devicesOptions = queryOptions({
  queryKey: ["devices"],
  queryFn: async ({ signal }) => {
    const response = await api.devices.$get({}, { init: { signal } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return (await response.json()).devices;
  },
});

type Device = InferResponseType<typeof api.devices.$get, 200>["devices"][number];

/** Shows the devices gone at once, then logs them out. The refetch puts back any that weren't. */
async function logOutDevices(
  keep: (device: Device) => boolean,
  send: () => Promise<{ ok: boolean }>,
) {
  queryClient.setQueryData(devicesOptions.queryKey, (current) => current?.filter(keep));
  try {
    const response = await send();
    if (!response.ok) toast.add({ title: "Could not log out. Please try again." });
  } catch {
    toast.add({ title: "Could not reach Soba. Check your connection and try again." });
  }
  await queryClient.invalidateQueries({ queryKey: devicesOptions.queryKey });
}

const kindIcons = { phone: SmartPhone01Icon, tablet: Tablet01Icon, computer: LaptopIcon };

/** Where the member is logged in, with a way to log out a lost phone or an old browser. */
export function DevicesGroup() {
  const { data: devices, isError } = useQuery(devicesOptions);
  const [confirmingAll, setConfirmingAll] = useState(false);
  // Kept after the dialog closes, so its title doesn't change while it animates out.
  const [confirmingCount, setConfirmingCount] = useState(0);
  const others = devices?.filter((device) => !device.current) ?? [];
  // This device first, then the most recently used, as the server sorts them.
  const sorted = devices?.toSorted((a, b) => Number(b.current) - Number(a.current));

  return (
    <>
      <SettingsGroup
        id="devices"
        note="Where you’re logged in. A device you log out may keep working for up to 5 minutes."
        title="Devices"
      >
        {devices === undefined && (
          <p className={cn(settingsRowStyles, "text-olive-500")}>
            {isError ? "Could not load your devices." : "Loading…"}
          </p>
        )}
        {sorted?.map((session) => {
          const device = describeDevice(session.userAgent);
          const DeviceIcon = kindIcons[device.kind];
          return (
            <div className={settingsRowStyles} key={session.id}>
              <SettingsRowIcon>
                <span className="flex size-8 items-center justify-center rounded-full bg-olive-200 text-olive-600 dark:bg-olive-800 dark:text-olive-400 [&_svg]:size-4">
                  <DeviceIcon />
                </span>
              </SettingsRowIcon>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{device.name}</p>
                  {session.current && <Badge>This device</Badge>}
                </div>
                <p className="truncate text-sm text-olive-500">
                  {session.current ? "Active now" : describeActivity(session.updatedAt)}
                </p>
              </div>
              {!session.current && (
                <Button
                  onClick={() =>
                    void logOutDevices(
                      (other) => other.id !== session.id,
                      () => api.devices[":sessionId"].$delete({ param: { sessionId: session.id } }),
                    )
                  }
                >
                  Log out
                </Button>
              )}
            </div>
          );
        })}
        {others.length > 1 && (
          <button
            className={cn(settingsButtonRowStyles, "text-red-600 dark:text-red-400")}
            onClick={() => {
              setConfirmingCount(others.length);
              setConfirmingAll(true);
            }}
            type="button"
          >
            <SettingsRowIcon>
              <Logout03Icon />
            </SettingsRowIcon>
            Log out of all other devices…
          </button>
        )}
      </SettingsGroup>

      <ConfirmDialog
        action="Log out"
        description="You stay logged in here. Log in again on the others to use them."
        onConfirm={() =>
          void logOutDevices(
            (device) => device.current,
            () => api.devices.others.$delete(),
          )
        }
        onOpenChange={setConfirmingAll}
        open={confirmingAll}
        title={`Log out of ${confirmingCount} other devices?`}
      />
    </>
  );
}

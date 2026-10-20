import { Button } from "@client/components/ui/button";
import { Add01Icon, ChevronRightIcon, Plug01Icon } from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import { toast } from "@client/components/ui/toast";
import { connectionsOptions } from "@client/features/assistants/connections";
import type { Connection } from "@client/features/assistants/connections";
import { api } from "@client/lib/api";
import { queryClient } from "@client/lib/query";
import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { useState } from "react";
import type { ReactNode } from "react";

import { ConfirmDialog } from "./confirm-dialog";
import { CopyButton } from "./copy-button";
import {
  SettingsField,
  SettingsGroup,
  SettingsRowIcon,
  settingsButtonRowStyles,
  settingsRowStyles,
} from "./settings-group";

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function describeUse(connection: Connection) {
  const used = connection.lastUsedAt ?? connection.connectedAt;
  if (!used) return null;
  return `${connection.lastUsedAt ? "Last used" : "Connected"} ${dateFormat.format(new Date(used))}`;
}

// A circle like a member's avatar fallback, as in the invite link row.
function RowCircle({ children }: { children: ReactNode }) {
  return (
    <SettingsRowIcon>
      <span className="flex size-8 items-center justify-center rounded-full bg-olive-200 text-olive-600 dark:bg-olive-800 dark:text-olive-400 [&_svg]:size-4">
        {children}
      </span>
    </SettingsRowIcon>
  );
}

async function disconnect(connection: Connection) {
  // Shown gone at once; the refetch puts it back if the server refused.
  queryClient.setQueryData(connectionsOptions.queryKey, (current) =>
    current?.filter((other) => other.clientId !== connection.clientId),
  );
  try {
    const response = await api.connections[":clientId"].$delete({
      param: { clientId: connection.clientId },
    });
    if (!response.ok) toast.add({ title: "Could not disconnect. Please try again." });
  } catch {
    toast.add({ title: "Could not reach Soba. Check your connection and try again." });
  }
  await queryClient.invalidateQueries({ queryKey: connectionsOptions.queryKey });
}

/**
 * The member's own AI assistants, like Claude, connected over MCP. With none, it shows how to
 * connect one; with some, it lists them, and connecting another is a row away.
 */
export function AssistantsGroup() {
  const { data: connections, isError } = useQuery(connectionsOptions);
  const [showingSetup, setShowingSetup] = useState(false);
  // Kept after the dialog closes, so its text doesn't change while it animates out.
  const [disconnecting, setDisconnecting] = useState<Connection | null>(null);
  const [confirming, setConfirming] = useState(false);
  const connected = connections !== undefined && connections.length > 0;
  const connectorUrl = `${window.location.origin}/mcp`;

  return (
    <>
      <SettingsGroup
        id="assistants"
        note={
          connected
            ? "Your assistants can see and change the household’s recipes and meal plan."
            : "Let an AI assistant like Claude or ChatGPT find your recipes, save new ones, and plan dinners."
        }
        title="AI assistants"
      >
        {connections === undefined && (
          <p className={cn(settingsRowStyles, "text-olive-500")}>
            {isError ? "Could not load your assistants." : "Loading…"}
          </p>
        )}

        {connections?.map((connection) => (
          <div className={settingsRowStyles} key={connection.clientId}>
            <RowCircle>
              <Plug01Icon />
            </RowCircle>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{connection.name ?? "Unnamed app"}</p>
              <p className="truncate text-sm text-olive-500">
                {[connection.host, describeUse(connection)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button
              onClick={() => {
                setDisconnecting(connection);
                setConfirming(true);
              }}
            >
              Disconnect
            </Button>
          </div>
        ))}

        {connections !== undefined &&
          (connected && !showingSetup ? (
            <button
              className={cn(settingsButtonRowStyles)}
              onClick={() => setShowingSetup(true)}
              type="button"
            >
              <RowCircle>
                <Add01Icon />
              </RowCircle>
              Connect another
              <ChevronRightIcon className="ml-auto" />
            </button>
          ) : (
            <>
              <SettingsField htmlFor="connector-url" label="Connector URL">
                {/* Spaced like the invite link and its copy button. */}
                <div className="flex w-full gap-2">
                  <Input
                    className="font-mono text-sm"
                    id="connector-url"
                    onFocus={(event) => event.currentTarget.select()}
                    readOnly
                    value={connectorUrl}
                  />
                  <CopyButton value={connectorUrl} />
                </div>
              </SettingsField>
              <p className={cn(settingsRowStyles, "block text-sm text-olive-500")}>
                Add it as a custom connector in your assistant’s settings, then log in to Soba and
                allow access. In Claude: Settings → Connectors → Add custom connector.
              </p>
            </>
          ))}
      </SettingsGroup>

      <ConfirmDialog
        action="Disconnect"
        description="It loses access to your household right away. You can connect it again later."
        onConfirm={() => {
          if (disconnecting) void disconnect(disconnecting);
        }}
        onOpenChange={setConfirming}
        open={confirming}
        title={`Disconnect ${disconnecting?.name ?? "this app"}?`}
      />
    </>
  );
}

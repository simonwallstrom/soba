import { Button } from "@client/components/ui/button";
import { CheckIcon, Copy01Icon } from "@client/components/ui/icons";
import { useState } from "react";

// Copies a value to paste somewhere else, like the connector URL. Just the icon, which turns to a
// check, so the field beside it keeps its width.
export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      aria-label={copied ? "Copied" : "Copy"}
      className="shrink-0 rounded-lg"
      onClick={() => void copy()}
      size="icon"
    >
      {copied ? <CheckIcon /> : <Copy01Icon />}
    </Button>
  );
}

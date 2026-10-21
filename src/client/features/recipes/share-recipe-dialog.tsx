import { Button } from "@client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { CheckIcon, Copy01Icon, Share08Icon } from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import { Switch } from "@client/components/ui/switch";
import { WithTooltip } from "@client/components/ui/tooltip";
import { resetRecipeShareLink, setRecipeSharing } from "@client/features/recipes/recipe-data";
import { recipeSharePath } from "@shared/recipes";
import type { Recipe } from "@shared/recipes";
import { useState } from "react";

// Turns a recipe's link on or off, and copies it. The link shows at once, as the app makes its
// token. Turning it off stops the link working, and turning it on again brings the same link
// back; resetting it makes a new one, so the old link stops working for good.
export function ShareRecipeDialog({
  onOpenChange,
  open,
  recipe,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  recipe: Pick<Recipe, "id" | "title" | "shareToken" | "isShared">;
}) {
  const [copied, setCopied] = useState(false);
  // Briefly confirms a reset, since the new link looks much like the old one.
  const [justReset, setJustReset] = useState(false);
  const url =
    recipe.isShared && recipe.shareToken
      ? new URL(recipeSharePath(recipe.shareToken), window.location.origin).toString()
      : null;
  // Phones hand the link to the share sheet; elsewhere, copying is enough.
  const canShare = typeof navigator.share === "function" && matchMedia("(pointer: coarse)").matches;

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setCopied(false);
    setJustReset(true);
    setTimeout(() => setJustReset(false), 3000);
    void resetRecipeShareLink(recipe.id);
  }

  async function share() {
    if (!url) return;
    try {
      await navigator.share({ title: recipe.title, url });
    } catch {
      // Closing the share sheet rejects too.
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share {recipe.title}</DialogTitle>
          <DialogDescription>
            Send the recipe to anyone, even if they don’t use Soba.
          </DialogDescription>
        </DialogHeader>
        {/* The setting and its link, set apart from the dialog's text, as one card. */}
        <div className="flex flex-col gap-3 rounded-xl bg-black/4 p-4 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <label className="font-medium" htmlFor="share-recipe-switch">
                Enable public link
              </label>
              <p className="text-sm text-olive-500">
                {url ? "Turn it off to stop the link working." : "Anyone with the link can view."}
              </p>
            </div>
            <Switch
              checked={url !== null}
              id="share-recipe-switch"
              onCheckedChange={(on) => {
                setCopied(false);
                setJustReset(false);
                void setRecipeSharing(recipe, on);
              }}
            />
          </div>
          {url && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  aria-label="Link to the recipe"
                  onFocus={(event) => event.currentTarget.select()}
                  readOnly
                  value={url}
                />
                {/* Just the icon, which turns to a check, so the field keeps its width. */}
                <WithTooltip>
                  <Button
                    aria-label={copied ? "Copied" : "Copy link"}
                    className="shrink-0 rounded-lg"
                    onClick={() => void copy()}
                    size="icon"
                  >
                    {copied ? <CheckIcon /> : <Copy01Icon />}
                  </Button>
                </WithTooltip>
              </div>
              {justReset ? (
                <output className="text-sm text-olive-500">
                  Link reset. The old one no longer works.
                </output>
              ) : (
                <p className="text-sm text-olive-500">
                  If it’s been shared too widely,{" "}
                  <button
                    className="underline underline-offset-2 hover:text-olive-700 dark:hover:text-olive-300"
                    onClick={reset}
                    type="button"
                  >
                    reset it
                  </button>
                  .
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="primary">
            Done
          </Button>
          {url && canShare && (
            <Button onClick={() => void share()}>
              <Share08Icon />
              Share…
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

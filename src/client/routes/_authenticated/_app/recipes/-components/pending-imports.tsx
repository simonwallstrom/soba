import { MediaGridItem, MediaItems, MediaListItem } from "@client/components/particles/media-item";
import { Button } from "@client/components/ui/button";
import { Cancel01Icon, ImageUploadIcon, LinkSquare02Icon } from "@client/components/ui/icons";
import { toast } from "@client/components/ui/toast";
import {
  dismissImport,
  importHost,
  isImportRunning,
  retryImport,
} from "@client/features/recipes/recipe-imports";
import type { RecipeImport } from "@client/features/recipes/recipe-imports";
import { recipePhotoUrl } from "@shared/recipes";
import type { RecipeView } from "@shared/recipes";
import { cn } from "cn";
import { useState } from "react";

// What each import is doing, in the member's words.
function statusText(item: RecipeImport) {
  if (item.status === "failed") return item.error ?? "Something went wrong.";
  if (item.status === "reading") {
    return item.kind === "page" ? "Reading the page…" : "Reading the photos…";
  }
  return item.status === "writing" ? "Writing the recipe…" : "Saving…";
}

function title(item: RecipeImport) {
  const host = importHost(item.sourceUrl);
  if (item.status === "failed") {
    return host ? `Couldn’t import from ${host}` : "Couldn’t import the photos";
  }
  if (item.title) return item.title;
  return host ? `Importing from ${host}…` : "Importing a recipe…";
}

// Imports still on their way, above the recipes. They cannot be opened yet; a failed one says
// why and offers what to do next.
export function PendingImports({
  imports,
  onImportPhoto,
  tagNames,
  view,
}: {
  imports: readonly RecipeImport[];
  onImportPhoto: () => void;
  tagNames: string[];
  view: RecipeView;
}) {
  const Item = view === "grid" ? MediaGridItem : MediaListItem;
  return (
    <MediaItems view={view}>
      {imports.map((item) => (
        <Item
          actions={
            <PendingImportActions item={item} onImportPhoto={onImportPhoto} tagNames={tagNames} />
          }
          details={
            <span
              className={cn(
                isImportRunning(item) && "shimmer",
                item.status === "failed" && "text-red-700 dark:text-red-300",
              )}
            >
              {statusText(item)}
            </span>
          }
          imageUrl={item.photoId ? recipePhotoUrl(item.photoId) : null}
          key={item.id}
          placeholderIcon={item.kind === "page" ? <LinkSquare02Icon /> : <ImageUploadIcon />}
          title={title(item)}
        />
      ))}
    </MediaItems>
  );
}

function PendingImportActions({
  item,
  onImportPhoto,
  tagNames,
}: {
  item: RecipeImport;
  onImportPhoto: () => void;
  tagNames: string[];
}) {
  const [isBusy, setIsBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setIsBusy(true);
    try {
      await action();
    } catch (error) {
      toast.add({
        title: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  const dismiss = (
    <Button
      aria-label={item.status === "failed" ? "Dismiss" : "Cancel import"}
      disabled={isBusy}
      onClick={() => void run(() => dismissImport(item.id))}
      size="icon-sm"
      title={item.status === "failed" ? "Dismiss" : "Cancel import"}
      variant="ghost"
    >
      <Cancel01Icon />
    </Button>
  );
  if (item.status !== "failed") return dismiss;

  return (
    <div className="flex items-center gap-1">
      {/* Blocked sites will not let a retry through either, but a photo of the page works. */}
      {item.kind === "page" && (
        <Button className="max-sm:hidden" onClick={onImportPhoto} size="sm" variant="ghost">
          Try a photo
        </Button>
      )}
      <Button
        disabled={isBusy}
        onClick={() => void run(() => retryImport(item.id, tagNames))}
        size="sm"
      >
        Retry
      </Button>
      {dismiss}
    </div>
  );
}

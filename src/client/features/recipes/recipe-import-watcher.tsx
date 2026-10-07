import { toast } from "@client/components/ui/toast";
import { useHouseholdQuery, useHouseholdStore } from "@client/features/household/store";
import { tags$ } from "@client/features/recipes/queries";
import {
  claimImport,
  importedRecipeEvents,
  importHost,
  recipeImportsOptions,
} from "@client/features/recipes/recipe-imports";
import type { RecipeImport } from "@client/features/recipes/recipe-imports";
import { queryClient } from "@client/lib/query";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useEffectEvent, useRef, useSyncExternalStore } from "react";

// Long enough to notice a toast that arrives while looking elsewhere.
const toastTimeout = 8000;

// Imports being claimed by this tab, so a re-render never claims one twice.
const claiming = new Set<string>();

// Recipes imported in the last few seconds, which the recipe list highlights as they arrive.
let recentlyImported: ReadonlySet<string> = new Set();
const recentListeners = new Set<() => void>();

function setRecentlyImported(next: ReadonlySet<string>) {
  recentlyImported = next;
  for (const listener of recentListeners) listener();
}

// Pages that want to know the moment an import becomes a recipe, like the recipe list.
const importListeners = new Set<(id: string) => void>();

export function onRecipeImported(listener: (id: string) => void) {
  importListeners.add(listener);
  return () => {
    importListeners.delete(listener);
  };
}

function markRecentlyImported(id: string) {
  for (const listener of importListeners) listener(id);
  setRecentlyImported(new Set([...recentlyImported, id]));
  setTimeout(() => {
    setRecentlyImported(new Set([...recentlyImported].filter((other) => other !== id)));
  }, 4000);
}

export function useRecentlyImported() {
  return useSyncExternalStore(
    (listener) => {
      recentListeners.add(listener);
      return () => recentListeners.delete(listener);
    },
    () => recentlyImported,
  );
}

// Saves this member's finished imports wherever they are in the app, and says so with a toast.
// Imports finish on the server, so one started before a reload or on another device is saved
// the next time any of the member's tabs is open.
export function RecipeImportWatcher({
  householdId,
  userId,
}: {
  householdId: string;
  userId: string;
}) {
  const store = useHouseholdStore(householdId);
  const tags = useHouseholdQuery(householdId, tags$);
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const { data: imports } = useQuery(recipeImportsOptions);
  // The status each import had when last seen, to notice the moment one fails.
  const lastStatus = useRef(new Map<string, RecipeImport["status"]>());

  const save = useEffectEvent(async (item: RecipeImport) => {
    const claimed = await claimImport(item.id).catch(() => null);
    if (claimed) {
      // Drops the pending item in the same render the recipe appears in, instead of after the
      // refetch below, so the two never show side by side. A poll already under way could
      // still bring the item back, so it is canceled first.
      await queryClient.cancelQueries({ queryKey: recipeImportsOptions.queryKey });
      queryClient.setQueryData(recipeImportsOptions.queryKey, (current) =>
        current?.filter((other) => other.id !== item.id),
      );
      store.commit(...importedRecipeEvents(claimed, { id: item.id, tags, userId, at: new Date() }));
      markRecentlyImported(item.id);
      toast.add({
        title: "Recipe imported",
        description: claimed.recipe.title,
        timeout: toastTimeout,
        actionProps: {
          children: "Open",
          onClick: () => void navigate({ to: "/recipes/$recipeId", params: { recipeId: item.id } }),
        },
      });
    }
    claiming.delete(item.id);
    await queryClient.invalidateQueries({ queryKey: recipeImportsOptions.queryKey });
  });

  const notifyFailure = useEffectEvent((item: RecipeImport) => {
    // The recipe list shows the failed import itself, with what to do next.
    if (pathname === "/recipes") return;
    const host = importHost(item.sourceUrl);
    toast.add({
      title: host ? `Couldn’t import from ${host}` : "Couldn’t import the recipe",
      description: item.error ?? undefined,
      timeout: toastTimeout,
      actionProps: { children: "Show", onClick: () => void navigate({ to: "/recipes" }) },
    });
  });

  useEffect(() => {
    if (!imports) return;
    for (const item of imports) {
      const previous = lastStatus.current.get(item.id);
      lastStatus.current.set(item.id, item.status);
      if (item.status === "failed" && previous !== undefined && previous !== "failed") {
        notifyFailure(item);
      }
      if (item.status === "ready" && !claiming.has(item.id)) {
        claiming.add(item.id);
        void save(item);
      }
    }
  }, [imports]);

  return null;
}

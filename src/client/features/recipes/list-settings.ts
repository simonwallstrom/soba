import { recipeDetails, recipeSorts, recipeViews } from "@shared/recipes";
import { useSyncExternalStore } from "react";
import * as v from "valibot";

const storageKey = "soba-recipe-list";

const settingsSchema = v.object({
  view: v.picklist(recipeViews),
  sort: v.picklist(recipeSorts),
  visibleDetails: v.array(v.picklist(recipeDetails)),
  isMealPlannerOpen: v.boolean(),
});

// How this device shows the recipe list. Shared by its tabs, and never sent to the server.
export type RecipeListSettings = v.InferOutput<typeof settingsSchema>;

const defaults: RecipeListSettings = {
  view: "list",
  sort: "name",
  visibleDetails: [...recipeDetails],
  // Closed until opened, so a first visit shows just the recipes.
  isMealPlannerOpen: false,
};

function readSettings() {
  try {
    const stored = localStorage.getItem(storageKey);
    const result = v.safeParse(settingsSchema, stored ? JSON.parse(stored) : null);
    return result.success ? result.output : defaults;
  } catch {
    return defaults;
  }
}

let settings = readSettings();
const listeners = new Set<() => void>();

function setSettings(next: RecipeListSettings) {
  settings = next;
  for (const listener of listeners) listener();
}

// Another tab changed the settings.
function onStorage(event: StorageEvent) {
  if (event.key === storageKey) setSettings(readSettings());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function updateSettings(change: Partial<RecipeListSettings>) {
  setSettings({ ...settings, ...change });
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private browsing; the settings then last until a reload.
  }
}

export function useRecipeListSettings() {
  return [useSyncExternalStore(subscribe, () => settings), updateSettings] as const;
}

import { useSyncExternalStore } from "react";
import * as v from "valibot";

// What someone cooking from a recipe has changed: the servings they scaled to, the ingredients
// they checked off, and the steps they finished. Kept in this browser, so a reload or a closed
// tab keeps their place, and dropped a day after they last touched it, so next week starts fresh.
const sessionSchema = v.object({
  servings: v.nullable(v.number()),
  // Ingredient lines and steps as written, so editing the recipe keeps the rest marked.
  checked: v.array(v.string()),
  done: v.array(v.string()),
  updatedAt: v.number(),
});
type CookingSession = v.InferOutput<typeof sessionSchema>;
type Sessions = Readonly<Record<string, CookingSession>>;

// Ingredients checked off, or steps done.
export type CookingMarks = {
  has: (item: string) => boolean;
  set: (item: string, isMarked: boolean) => void;
  clear: () => void;
};

const storageKey = "soba-cooking";
const keepForMs = 24 * 60 * 60_000;
const emptySession: CookingSession = { servings: null, checked: [], done: [], updatedAt: 0 };

function withoutExpired(all: Sessions, now: number): Sessions {
  const kept = Object.entries(all).filter(([, session]) => now - session.updatedAt < keepForMs);
  return kept.length === Object.keys(all).length ? all : Object.fromEntries(kept);
}

function readSessions(): Sessions {
  try {
    const stored = localStorage.getItem(storageKey);
    const result = v.safeParse(v.record(v.string(), sessionSchema), stored && JSON.parse(stored));
    if (result.success) return withoutExpired(result.output, Date.now());
  } catch {
    // Storage can be blocked or hold something unreadable; start fresh.
  }
  return {};
}

let sessions = readSessions();
const listeners = new Set<() => void>();

function setSessions(next: Sessions, store = true) {
  if (next === sessions) return;
  sessions = next;
  if (store) {
    try {
      if (Object.keys(next).length === 0) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Without storage, sessions only last until a reload.
    }
  }
  for (const listener of listeners) listener();
}

// Another tab changed the sessions.
function onStorage(event: StorageEvent) {
  if (event.key === storageKey || event.key === null) setSessions(readSessions(), false);
}

// A tab left open overnight drops yesterday's sessions when it's looked at again.
function onVisible() {
  if (document.visibilityState === "visible") setSessions(withoutExpired(sessions, Date.now()));
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

function useSessions() {
  return useSyncExternalStore(subscribe, () => sessions);
}

function updateSession(recipeId: string, update: (session: CookingSession) => CookingSession) {
  const now = Date.now();
  const { [recipeId]: current = emptySession, ...others } = withoutExpired(sessions, now);
  const next = update(current);
  const isEmpty = next.servings === null && next.checked.length === 0 && next.done.length === 0;
  setSessions(isEmpty ? others : { ...others, [recipeId]: { ...next, updatedAt: now } });
}

export function useCookingSession(recipeId: string, recipeServings: number | null) {
  const session = useSessions()[recipeId] ?? emptySession;

  function marks(list: "checked" | "done"): CookingMarks {
    const marked = new Set(session[list]);
    return {
      has: (item) => marked.has(item),
      set: (item, isMarked) => {
        updateSession(recipeId, (current) => ({
          ...current,
          [list]: isMarked
            ? [...current[list].filter((markedItem) => markedItem !== item), item]
            : current[list].filter((markedItem) => markedItem !== item),
        }));
      },
      clear: () => updateSession(recipeId, (current) => ({ ...current, [list]: [] })),
    };
  }

  return {
    // Scaling needs the recipe's own servings to scale from.
    servings: recipeServings === null ? null : (session.servings ?? recipeServings),
    setServings: (servings: number) => {
      updateSession(recipeId, (current) => ({
        ...current,
        servings: servings === recipeServings ? null : servings,
      }));
    },
    checked: marks("checked"),
    done: marks("done"),
  };
}

/**
 * The recipes being cooked from, most recently touched first: those with an ingredient checked
 * or a step done, until every step is. Scaling alone doesn't count.
 */
export function cookingProgress<
  TRecipe extends { id: string; instructions: readonly { items: readonly string[] }[] },
>(recipes: readonly TRecipe[], all: Sessions) {
  return recipes
    .flatMap((recipe) => {
      const session = all[recipe.id];
      if (!session || (session.checked.length === 0 && session.done.length === 0)) return [];
      const steps = recipe.instructions.flatMap((section) => section.items);
      const done = new Set(session.done);
      const doneCount = steps.filter((step) => done.has(step)).length;
      if (steps.length > 0 && doneCount === steps.length) return [];
      return [{ recipe, doneCount, stepCount: steps.length, updatedAt: session.updatedAt }];
    })
    .toSorted((left, right) => right.updatedAt - left.updatedAt);
}

export function useCookingProgress<
  TRecipe extends { id: string; instructions: readonly { items: readonly string[] }[] },
>(recipes: readonly TRecipe[]) {
  return cookingProgress(recipes, useSessions());
}

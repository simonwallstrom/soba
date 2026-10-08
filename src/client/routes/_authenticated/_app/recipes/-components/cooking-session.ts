import { useEffect, useState } from "react";

// What someone cooking from a recipe has changed: the servings they scaled to, the ingredients
// they checked off, and the steps they finished. Kept for the tab, so a reload keeps it and next
// week starts fresh.
type CookingSession = {
  servings: number | null;
  // Ingredient lines and steps as written, so editing the recipe keeps the rest marked.
  checked: string[];
  done: string[];
};

// Ingredients checked off, or steps done.
export type CookingMarks = {
  has: (item: string) => boolean;
  set: (item: string, isMarked: boolean) => void;
  clear: () => void;
};

const emptySession: CookingSession = { servings: null, checked: [], done: [] };

function storageKey(recipeId: string) {
  return `soba:cooking:${recipeId}`;
}

function readStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readSession(recipeId: string): CookingSession {
  try {
    const stored = sessionStorage.getItem(storageKey(recipeId));
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    if (parsed && typeof parsed === "object") {
      const servings = "servings" in parsed ? parsed.servings : null;
      return {
        servings: typeof servings === "number" ? servings : null,
        checked: readStrings("checked" in parsed ? parsed.checked : null),
        done: readStrings("done" in parsed ? parsed.done : null),
      };
    }
  } catch {
    // Storage can be blocked or hold something unreadable; start fresh.
  }
  return emptySession;
}

// Mount once per recipe (key it by the recipe ID) so each starts from its own session.
export function useCookingSession(recipeId: string, recipeServings: number | null) {
  const [session, setSession] = useState(() => readSession(recipeId));

  useEffect(() => {
    try {
      const key = storageKey(recipeId);
      const isEmpty =
        session.servings === null && session.checked.length === 0 && session.done.length === 0;
      if (isEmpty) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, JSON.stringify(session));
    } catch {
      // Without storage, the session only lasts until a reload.
    }
  }, [recipeId, session]);

  function marks(list: "checked" | "done"): CookingMarks {
    const marked = new Set(session[list]);
    return {
      has: (item) => marked.has(item),
      set: (item, isMarked) => {
        setSession((current) => ({
          ...current,
          [list]: isMarked
            ? [...current[list], item]
            : current[list].filter((markedItem) => markedItem !== item),
        }));
      },
      clear: () => setSession((current) => ({ ...current, [list]: [] })),
    };
  }

  return {
    // Scaling needs the recipe's own servings to scale from.
    servings: recipeServings === null ? null : (session.servings ?? recipeServings),
    setServings: (servings: number) => {
      setSession((current) => ({
        ...current,
        servings: servings === recipeServings ? null : servings,
      }));
    },
    checked: marks("checked"),
    done: marks("done"),
  };
}

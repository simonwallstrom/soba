import { useHouseholdStore } from "@client/features/household/store";
import { recipeProfiles$, recipes$ } from "@client/features/recipes/queries";
import { profileRecipe, recipesToProfile } from "@client/features/recipes/recipe-profile";
import type { Store } from "@livestore/livestore";
import { recipeProfileSource, recipeProfileSourceHash } from "@shared/recipe-profile";
import type { recipeSchema } from "@shared/recipes";
import { useEffect } from "react";

// Sync pulls in the background, so other members' profiles may still be on their way when the
// app opens. Recipes this member saves meanwhile don't wait.
const startDelayMs = 10_000;
// The API allows each member a few dozen reads a minute.
const rateLimitPauseMs = 60_000;

// One tab per browser reads recipes; the others queue behind it.
const lockName = "soba-recipe-profiles";

function createProfiler(store: Store<typeof recipeSchema>, userId: string) {
  const startedAt = Date.now();
  const abort = new AbortController();
  // Recipes whose read failed this session, by the source hash that failed, so a broken one
  // isn't retried in a loop. An edit or the next session tries again.
  const failed = new Map<string, string>();
  let pausedUntil = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let again = false;

  function wakeAt(at: number) {
    clearTimeout(timer);
    timer = setTimeout(() => void run(), Math.max(0, at - Date.now()));
  }

  // Reads due recipes one at a time, then sleeps until the next one is due.
  async function sweep() {
    const settledAt = startedAt + startDelayMs;
    while (!abort.signal.aborted) {
      const now = Date.now();
      if (now < pausedUntil) return wakeAt(pausedUntil);
      const pending = recipesToProfile(store, userId)
        .filter(
          ({ recipe }) =>
            failed.get(recipe.id) !== recipeProfileSourceHash(recipeProfileSource(recipe)),
        )
        .map(({ recipe, dueAt }) => ({
          recipe,
          // A recipe this member saved since the app opened can't have a profile on its way.
          dueAt:
            recipe.updatedBy === userId && recipe.updatedAt.getTime() >= startedAt
              ? dueAt
              : Math.max(dueAt, settledAt),
        }));
      const next = pending.find(({ dueAt }) => dueAt <= now);
      if (!next) {
        const soonest = Math.min(...pending.map(({ dueAt }) => dueAt));
        if (Number.isFinite(soonest)) wakeAt(soonest);
        return;
      }
      const result = await profileRecipe(store, next.recipe);
      if (result === "failed") {
        failed.set(next.recipe.id, recipeProfileSourceHash(recipeProfileSource(next.recipe)));
      } else if (result === "rate-limited") {
        pausedUntil = Date.now() + rateLimitPauseMs;
      }
    }
  }

  async function run() {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      await navigator.locks.request(lockName, { signal: abort.signal }, async () => {
        do {
          again = false;
          await sweep();
        } while (again && !abort.signal.aborted);
      });
    } catch {
      // Stopped while waiting for another tab.
    } finally {
      running = false;
    }
  }

  return {
    run,
    stop() {
      abort.abort();
      clearTimeout(timer);
    },
  };
}

// Keeps every recipe's profile current in the background, so meal suggestions know what each
// recipe is: new and edited recipes, ones whose read failed or never finished, and all of them
// when the questions change. A member's own saves are read right away; others' after a grace
// period, in case the member who saved them is still reading them.
export function RecipeProfiler({ householdId, userId }: { householdId: string; userId: string }) {
  const store = useHouseholdStore(householdId);

  useEffect(() => {
    const profiler = createProfiler(store, userId);
    // Any change to recipes or profiles may leave one to read.
    const unsubscribeRecipes = store.subscribe(recipes$, () => void profiler.run());
    const unsubscribeProfiles = store.subscribe(recipeProfiles$, () => void profiler.run());
    void profiler.run();
    return () => {
      unsubscribeRecipes();
      unsubscribeProfiles();
      profiler.stop();
    };
  }, [store, userId]);

  return null;
}

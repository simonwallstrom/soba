import { useSyncExternalStore } from "react";

import { dayKey } from "./weeks";

// Calls back at the next local midnight, and whenever the tab is shown again, since timers can
// run late while a laptop sleeps.
function subscribeToDay(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  function scheduleMidnight() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timer = setTimeout(() => {
      onChange();
      scheduleMidnight();
    }, midnight.getTime() - now.getTime());
  }
  scheduleMidnight();
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

function todayKey() {
  return dayKey(new Date());
}

/** Today's local date, like "2026-10-16", which stays right in a tab left open overnight. */
export function useToday() {
  return useSyncExternalStore(subscribeToDay, todayKey);
}

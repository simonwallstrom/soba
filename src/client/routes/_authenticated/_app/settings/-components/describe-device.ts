export type DeviceKind = "phone" | "tablet" | "computer";

// Order matters: Edge and Opera also say Chrome, Chrome also says Safari, and iPad also says Mac.
const browsers: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const systems: [RegExp, string, DeviceKind][] = [
  [/iPhone/, "iPhone", "phone"],
  [/iPad/, "iPad", "tablet"],
  [/Android.*Mobile/, "Android", "phone"],
  [/Android/, "Android tablet", "tablet"],
  [/Windows/, "Windows", "computer"],
  [/CrOS/, "ChromeOS", "computer"],
  [/Mac OS X|Macintosh/, "macOS", "computer"],
  [/Linux/, "Linux", "computer"],
];

/** Names a device from its user agent, like "Chrome on macOS". */
export function describeDevice(userAgent: string): { name: string; kind: DeviceKind } {
  const browser = browsers.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = systems.find(([pattern]) => pattern.test(userAgent));
  if (!system) return { name: browser ?? "Unknown device", kind: "computer" };
  return { name: browser ? `${browser} on ${system[1]}` : system[1], kind: system[2] };
}

const relativeDays = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

/**
 * When a device was last used, to the day. Counted in calendar days, so last night reads
 * "yesterday". Sessions refresh at most daily, so this can be a day behind.
 */
export function describeActivity(updatedAt: string, now = new Date()) {
  const then = new Date(updatedAt);
  const days = Math.round(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(then).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (days < 30) return `Active ${relativeDays.format(-Math.max(days, 0), "day")}`;
  return `Last active ${dateFormat.format(then)}`;
}

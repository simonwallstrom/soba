// Days of the week from Monday, 0 to 6.
export function weekdayOf(date: Date) {
  return (date.getDay() + 6) % 7;
}

// The local calendar date, as the meal plan stores it.
export function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export type Week = {
  // Monday through Sunday, at local midnight.
  days: Date[];
  // The ISO week number.
  number: number;
};

// The Monday-to-Sunday week that contains `date`.
export function getWeek(date: Date): Week {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
  // ISO weeks belong to the year of their Thursday.
  const thursday = days[3] ?? monday;
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  const number = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 604_800_000);
  return { days, number };
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Days before today are history: they show what was eaten but can't change.
export function isPast(date: Date, today: Date) {
  return date < startOfDay(today);
}

// Local midnight on a day like "2026-10-16".
export function dateOfKey(key: string) {
  const [year = 0, month = 1, day = 1] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

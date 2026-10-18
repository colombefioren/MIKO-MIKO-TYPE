const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// "Jun 18" for dates in the current year, "Jun 18, 2025" otherwise.
export function calendarDate(value, { weekday = false, now = new Date() } = {}) {
  const date = new Date(value);
  const options = { month: "short", day: "numeric" };
  if (weekday) options.weekday = "long";
  if (date.getFullYear() !== now.getFullYear()) options.year = "numeric";
  return date.toLocaleDateString(undefined, options);
}

export function timeAgo(value) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return calendarDate(date);
}

export function clockTime(value) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function dayLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today.getTime() - DAY);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return calendarDate(date, { weekday: true });
}

export const shortDate = (value) => calendarDate(value);

export function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

export function duration(ms) {
  const seconds = ms / 1000;
  if (seconds < 60) return `${round(seconds, 1)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

export const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// All "calendar" logic (today, this week, this month) follows the user's timezone,
// not the server's — Vercel servers run in UTC.
export const APP_TIMEZONE = "America/Sao_Paulo";

type Parts = { year: number; month: number; day: number; weekday: number };

function zonedParts(date: Date, timeZone = APP_TIMEZONE): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const map = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: weekdays.indexOf(map.weekday),
  };
}

/** Minutes the timezone is behind/ahead of UTC at a given instant (São Paulo → -180). */
export function timezoneOffsetMinutes(date: Date, timeZone = APP_TIMEZONE) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const m = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second);
  return Math.round((asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** Real instant when a local calendar day starts (00:00 in the app timezone). */
export function startOfLocalDay(year: number, month: number, day: number, timeZone = APP_TIMEZONE) {
  const guess = new Date(Date.UTC(year, month - 1, day));
  const offset = timezoneOffsetMinutes(guess, timeZone);
  return new Date(guess.getTime() - offset * 60000);
}

/** "2026-10-06" for the given instant, in the app timezone. */
export function localDateKey(date = new Date(), timeZone = APP_TIMEZONE) {
  const { year, month, day } = zonedParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "2026-10" */
export function monthKey(date = new Date(), timeZone = APP_TIMEZONE) {
  return localDateKey(date, timeZone).slice(0, 7);
}

/** Value for Postgres DATE columns: UTC midnight of the local calendar day. */
export function dateOnly(key = localDateKey()) {
  return new Date(`${key}T00:00:00.000Z`);
}

export function todayRange(now = new Date(), timeZone = APP_TIMEZONE) {
  const { year, month, day } = zonedParts(now, timeZone);
  const start = startOfLocalDay(year, month, day, timeZone);
  const end = startOfLocalDay(year, month, day + 1, timeZone);
  return { start, end };
}

/** Week runs Monday → Sunday. */
export function weekRange(now = new Date(), timeZone = APP_TIMEZONE, weeksAgo = 0) {
  const { year, month, day, weekday } = zonedParts(now, timeZone);
  const diffToMonday = (weekday + 6) % 7;
  const mondayDay = day - diffToMonday - weeksAgo * 7;
  const start = startOfLocalDay(year, month, mondayDay, timeZone);
  const end = startOfLocalDay(year, month, mondayDay + 7, timeZone);
  return { start, end };
}

export function monthRange(now = new Date(), timeZone = APP_TIMEZONE, monthsAgo = 0) {
  const { year, month } = zonedParts(now, timeZone);
  const start = startOfLocalDay(year, month - monthsAgo, 1, timeZone);
  const end = startOfLocalDay(year, month - monthsAgo + 1, 1, timeZone);
  return { start, end };
}

/** Same as monthRange but for DATE columns (stored as UTC midnight). */
export function monthDateRange(period: string) {
  const [y, m] = period.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

/** Converts an instant range into the matching range for DATE columns. */
export function toDateRange(range: { start: Date; end: Date }) {
  return { start: dateOnly(localDateKey(range.start)), end: dateOnly(localDateKey(range.end)) };
}

export function greeting(now = new Date(), timeZone = APP_TIMEZONE) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function formatLongDate(date = new Date(), timeZone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" }).format(date);
}

export function formatShortDate(date: Date | null | undefined, opts: { utc?: boolean } = {}) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: opts.utc ? "UTC" : APP_TIMEZONE,
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTime(date: Date, timeZone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(date);
}

/** For <input type="date"> default values. */
export function toInputDate(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** "YYYY-MM-DDTHH:mm" typed in the app timezone → real instant. */
export function fromLocalDateTime(value: string, timeZone = APP_TIMEZONE) {
  const [date, time = "00:00"] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(startOfLocalDay(y, m, d, timeZone).getTime() + (h * 60 + min) * 60000);
}

/** Instant → value for <input type="datetime-local"> in the app timezone. */
export function toInputDateTime(date: Date | null | undefined, timeZone = APP_TIMEZONE) {
  if (!date) return "";
  const offset = timezoneOffsetMinutes(date, timeZone);
  return new Date(date.getTime() + offset * 60000).toISOString().slice(0, 16);
}

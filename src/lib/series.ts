import "server-only";
import { db } from "./db";
import { monthRange, weekRange, APP_TIMEZONE } from "./dates";
import { entrySeconds } from "./utils";

/** Hours tracked per week, oldest first. */
export async function weeklyHours(userId: string, weeks = 8, now = new Date()) {
  const ranges = Array.from({ length: weeks }, (_, i) => weekRange(now, undefined, weeks - 1 - i));
  const entries = await db.timeEntry.findMany({
    where: { userId, startedAt: { gte: ranges[0].start, lt: ranges[ranges.length - 1].end } },
    select: { startedAt: true, endedAt: true },
  });

  return ranges.map((range, i) => {
    const seconds = entries
      .filter((e) => e.startedAt >= range.start && e.startedAt < range.end)
      .reduce((sum, e) => sum + entrySeconds(e, now), 0);
    return { label: i === weeks - 1 ? "This week" : `Week ${i + 1}`, value: Math.round((seconds / 3600) * 10) / 10 };
  });
}

/** Received money per month for one income stream, oldest first. */
export async function monthlyIncome(
  userId: string,
  opts: { stream: "BUSINESS" | "EMPLOYMENT"; currency: "BRL" | "USD"; months?: number; target?: number },
  now = new Date(),
) {
  const months = opts.months ?? 6;
  const ranges = Array.from({ length: months }, (_, i) => monthRange(now, undefined, months - 1 - i));
  // DATE columns are stored at UTC midnight, so compare with UTC month boundaries
  const first = ranges[0].start;
  const tx = await db.transaction.findMany({
    where: {
      userId,
      stream: opts.stream,
      currency: opts.currency,
      status: "RECEIVED",
      date: { gte: new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1)) },
    },
    select: { amount: true, date: true },
  });

  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: APP_TIMEZONE });
  return ranges.map((range) => {
    const mid = new Date(range.start.getTime() + 5 * 86400000);
    const key = `${mid.getUTCFullYear()}-${String(mid.getUTCMonth() + 1).padStart(2, "0")}`;
    const value = tx
      .filter((t) => t.date.toISOString().slice(0, 7) === key)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return { label: fmt.format(mid), value, secondary: opts.target };
  });
}

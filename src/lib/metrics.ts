import "server-only";
import { db } from "./db";
import { monthDateRange, monthKey, startOfLocalDay, weekRange } from "./dates";
import { entrySeconds } from "./utils";
import type { MetricValues } from "./goals";
import { ACHIEVEMENTS, unlockedKeys, type AchievementStats } from "./achievements";
import { getWeeklyCommits } from "./github";

/** Real values for every monthly goal metric. `period` is "YYYY-MM". */
export async function computeMonthMetrics(userId: string, period = monthKey()): Promise<MetricValues> {
  const [y, m] = period.split("-").map(Number);
  // Instant range (timestamps) and date range (DATE columns) for the same month
  const start = startOfLocalDay(y, m, 1);
  const end = startOfLocalDay(y, m + 1, 1);
  const dates = monthDateRange(period);
  const inMonth = { gte: start, lt: end };

  const [
    applications,
    technical,
    offers,
    entries,
    ticketsDone,
    shipped,
    newLeads,
    proposals,
    newClients,
    employment,
    business,
  ] = await Promise.all([
    db.jobApplication.count({ where: { userId, appliedAt: { gte: dates.start, lt: dates.end } } }),
    db.jobApplication.count({ where: { userId, technicalAt: inMonth } }),
    db.jobApplication.count({ where: { userId, offerAt: inMonth } }),
    db.timeEntry.findMany({ where: { userId, startedAt: inMonth }, select: { startedAt: true, endedAt: true } }),
    db.task.count({ where: { userId, completedAt: inMonth } }),
    db.project.count({ where: { userId, shippedAt: inMonth } }),
    db.lead.count({ where: { userId, createdAt: inMonth } }),
    db.lead.count({ where: { userId, proposalAt: inMonth } }),
    db.lead.count({ where: { userId, wonAt: inMonth } }),
    db.transaction.aggregate({
      where: { userId, stream: "EMPLOYMENT", status: "RECEIVED", currency: "USD", date: { gte: dates.start, lt: dates.end } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { userId, stream: "BUSINESS", status: "RECEIVED", currency: "BRL", date: { gte: dates.start, lt: dates.end } },
      _sum: { amount: true },
    }),
  ]);

  const seconds = entries.reduce((sum, e) => sum + entrySeconds(e), 0);

  return {
    applications,
    technical_interviews: technical,
    international_offer: offers,
    dev_hours: seconds / 3600,
    tickets_done: ticketsDone,
    projects_shipped: shipped,
    new_leads: newLeads,
    proposals,
    new_clients: newClients,
    employment_income_usd: Number(employment._sum.amount ?? 0),
    business_revenue_brl: Number(business._sum.amount ?? 0),
  };
}

export async function getGoalTargets(userId: string, period = monthKey()) {
  const goals = await db.goal.findMany({ where: { userId, period } });
  return Object.fromEntries(goals.map((g) => [g.metric, g.target]));
}

export async function secondsTracked(userId: string, range: { start: Date; end: Date }) {
  const entries = await db.timeEntry.findMany({
    where: { userId, startedAt: { gte: range.start, lt: range.end } },
    select: { startedAt: true, endedAt: true },
  });
  return entries.reduce((sum, e) => sum + entrySeconds(e), 0);
}

async function achievementStats(userId: string, commits: number): Promise<AchievementStats> {
  const [
    applicationsSent,
    technicalStages,
    offers,
    ticketsDone,
    usd,
    internationalClients,
    businessTx,
    workdaysCompleted,
    entries,
    sprintsCompleted,
    evidences,
  ] = await Promise.all([
    db.jobApplication.count({ where: { userId, appliedAt: { not: null } } }),
    db.jobApplication.count({ where: { userId, technicalAt: { not: null } } }),
    db.jobApplication.count({ where: { userId, offerAt: { not: null } } }),
    db.task.count({ where: { userId, status: "DONE" } }),
    db.transaction.aggregate({ where: { userId, status: "RECEIVED", currency: "USD" }, _sum: { amount: true } }),
    db.client.count({ where: { userId, NOT: { country: "Brazil" } } }),
    db.transaction.findMany({
      where: { userId, stream: "BUSINESS", status: "RECEIVED", currency: "BRL" },
      select: { amount: true, date: true },
    }),
    db.workday.count({ where: { userId, endedAt: { not: null } } }),
    db.timeEntry.findMany({ where: { userId }, select: { startedAt: true, endedAt: true } }),
    db.sprint.count({ where: { userId, status: "COMPLETED" } }),
    db.skillEvidence.count({ where: { skill: { userId } } }),
  ]);

  const byMonth = new Map<string, number>();
  for (const tx of businessTx) {
    const key = tx.date.toISOString().slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + Number(tx.amount));
  }

  return {
    applicationsSent,
    technicalStages,
    offers,
    ticketsDone,
    commits,
    usdEarned: Number(usd._sum.amount ?? 0),
    internationalClients,
    bestBusinessMonthBRL: Math.max(0, ...byMonth.values()),
    workdaysCompleted,
    trackedHours: entries.reduce((sum, e) => sum + entrySeconds(e), 0) / 3600,
    sprintsCompleted,
    evidences,
  };
}

/**
 * Stores newly unlocked achievements and writes them to the activity feed.
 * Called after mutations, so unlock dates reflect when they actually happened.
 */
export async function syncAchievements(userId: string, opts: { checkCommits?: boolean } = {}) {
  let commits = 0;
  if (opts.checkCommits) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { githubUsername: true } });
    commits = (await getWeeklyCommits(user?.githubUsername, weekRange().start))?.count ?? 0;
  }
  const stats = await achievementStats(userId, commits);
  const keys = unlockedKeys(stats);
  const existing = new Set(
    (await db.achievement.findMany({ where: { userId }, select: { key: true } })).map((a) => a.key),
  );
  const fresh = keys.filter((k) => !existing.has(k));

  for (const key of fresh) {
    const def = ACHIEVEMENTS.find((a) => a.key === key)!;
    await db.achievement.create({ data: { userId, key } });
    await logActivity(userId, "achievement", `Achievement unlocked: ${def.emoji} ${def.title}`);
  }
  return fresh;
}

export async function logActivity(userId: string, kind: string, message: string) {
  await db.activityLog.create({ data: { userId, kind, message } });
}

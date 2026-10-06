import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { monthRange, weekRange } from "@/lib/dates";
import { monthlyIncome, weeklyHours } from "@/lib/series";
import { TASK_CATEGORIES, TASK_TYPES } from "@/lib/labels";
import { entrySeconds, formatDuration, formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { BarsChart, FunnelChart, TrendChart } from "@/components/charts";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const user = await getCurrentUser();
  const userId = user.id;
  const now = new Date();
  const month = monthRange(now);
  const eightWeeksAgo = weekRange(now, undefined, 7).start;

  const [hours, business, employment, monthEntries, doneTasks, clients] = await Promise.all([
    weeklyHours(userId, 12, now),
    monthlyIncome(userId, { stream: "BUSINESS", currency: "BRL", months: 12 }),
    monthlyIncome(userId, { stream: "EMPLOYMENT", currency: "USD", months: 12 }),
    db.timeEntry.findMany({
      where: { userId, startedAt: { gte: month.start, lt: month.end } },
      include: { project: true, task: { select: { type: true } } },
    }),
    db.task.findMany({ where: { userId, completedAt: { gte: eightWeeksAgo } }, select: { completedAt: true, category: true } }),
    db.client.findMany({
      where: { userId },
      include: {
        projects: { include: { timeEntries: { select: { startedAt: true, endedAt: true } } } },
        transactions: { where: { status: "RECEIVED", currency: "BRL" }, select: { amount: true } },
      },
    }),
  ]);

  // Hours by project / by type this month
  const byProject = new Map<string, number>();
  const byType = new Map<string, number>();
  for (const e of monthEntries) {
    const s = entrySeconds(e, now) / 3600;
    const project = e.project?.name ?? "No project";
    byProject.set(project, (byProject.get(project) ?? 0) + s);
    const type = e.task ? TASK_TYPES[e.task.type] : "Other";
    byType.set(type, (byType.get(type) ?? 0) + s);
  }
  const toData = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value: Math.round(value * 10) / 10 }));

  // Development activity counts only technical tickets (not onboarding, business or career work)
  const devTasks = doneTasks.filter((t) => t.category === "DEVELOPMENT");
  const tickets = Array.from({ length: 8 }, (_, i) => {
    const range = weekRange(now, undefined, 7 - i);
    return {
      label: i === 7 ? "This week" : `W${i + 1}`,
      value: devTasks.filter((t) => t.completedAt! >= range.start && t.completedAt! < range.end).length,
    };
  });

  const monthDone = doneTasks.filter((t) => t.completedAt! >= month.start && t.completedAt! < month.end);
  const byCategory = TASK_CATEGORIES.map((c) => ({
    label: c.label,
    value: monthDone.filter((t) => t.category === c.value).length,
  }));

  const rates = clients
    .map((c) => {
      const seconds = c.projects.flatMap((p) => p.timeEntries).reduce((s, e) => s + entrySeconds(e, now), 0);
      const received = c.transactions.reduce((s, t) => s + Number(t.amount), 0);
      return { id: c.id, name: c.name, seconds, received, rate: seconds > 0 ? received / (seconds / 3600) : null };
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));

  return (
    <>
      <PageHeader title="Reports" subtitle="Productivity, revenue and development activity — all from real records." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Productivity" subtitle="Hours tracked per week (last 12 weeks)" />
          <BarsChart data={hours} format="hours" name="Worked" />
        </Card>
        <Card>
          <CardHeader title="Development activity" subtitle="Development tickets completed per week" />
          <BarsChart data={tickets} name="Tickets" />
        </Card>
        <Card>
          <CardHeader title="Revenue — Business" subtitle="Received per month (BRL)" />
          <TrendChart data={business} format="brl" names={["Received", "Goal"]} />
        </Card>
        <Card>
          <CardHeader title="Revenue — Employment" subtitle="Received per month (USD)" />
          <TrendChart data={employment} format="usd" names={["Received", "Goal"]} />
        </Card>
        <Card>
          <CardHeader title="Tickets by category" subtitle="Completed this month — only Development counts as productivity" />
          <FunnelChart data={byCategory} />
        </Card>
        <Card>
          <CardHeader title="Where the hours went" subtitle="By project, this month" />
          {byProject.size ? <FunnelChart data={toData(byProject)} /> : <p className="text-sm text-muted">No hours this month yet.</p>}
        </Card>
        <Card>
          <CardHeader title="Type of work" subtitle="By task type, this month" />
          {byType.size ? <FunnelChart data={toData(byType)} /> : <p className="text-sm text-muted">No hours this month yet.</p>}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Which client pays best per hour?" subtitle="Received ÷ hours worked (all time)" />
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="pb-2 font-semibold">Client</th>
              <th className="pb-2 text-right font-semibold">Hours</th>
              <th className="pb-2 text-right font-semibold">Received</th>
              <th className="pb-2 text-right font-semibold">Effective rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rates.map((r) => (
              <tr key={r.id}>
                <td className="py-2">{r.name}</td>
                <td className="py-2 text-right font-mono text-xs">{formatDuration(r.seconds)}</td>
                <td className="py-2 text-right">{formatMoney(r.received)}</td>
                <td className="py-2 text-right font-semibold">{r.rate !== null ? `${formatMoney(r.rate)}/h` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

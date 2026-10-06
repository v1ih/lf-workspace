import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { formatLongDate, greeting, monthKey, toDateRange, weekRange } from "@/lib/dates";
import { buildGoalProgress, AREAS, formatMetric, WEEKLY_TARGETS } from "@/lib/goals";
import { computeMonthMetrics, getGoalTargets, secondsTracked } from "@/lib/metrics";
import { weeklyHours } from "@/lib/series";
import { getWeeklyCommits } from "@/lib/github";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { APPLICATION_STATUSES } from "@/lib/labels";
import { formatDuration, formatMoney, percent, taskCode } from "@/lib/utils";
import { Card, CardHeader, Eyebrow } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarsChart, FunnelChart } from "@/components/charts";
import { ActivityFeed } from "@/components/activity-feed";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const userId = user.id;
  const now = new Date();
  const week = weekRange(now);
  const weekDates = toDateRange(week);
  const period = monthKey(now);
  const firstName = user.name.split(" ")[0];

  const [
    sprint,
    focus,
    weekSeconds,
    appsThisWeek,
    leadsThisWeek,
    openLeads,
    metrics,
    targets,
    hours,
    commits,
    activities,
    achievements,
    applications,
  ] = await Promise.all([
    db.sprint.findFirst({ where: { userId, status: "ACTIVE" }, include: { tasks: { select: { status: true } } } }),
    db.task.findFirst({ where: { userId, status: "IN_PROGRESS" }, include: { project: true }, orderBy: { updatedAt: "desc" } }),
    secondsTracked(userId, week),
    db.jobApplication.count({ where: { userId, appliedAt: { gte: weekDates.start, lt: weekDates.end } } }),
    db.lead.count({ where: { userId, contactedAt: { gte: week.start, lt: week.end } } }),
    db.lead.findMany({ where: { userId, stage: { notIn: ["WON", "LOST"] } }, select: { value: true } }),
    computeMonthMetrics(userId, period),
    getGoalTargets(userId, period),
    weeklyHours(userId, 8, now),
    getWeeklyCommits(user.githubUsername, week.start),
    db.activityLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.achievement.findMany({ where: { userId }, orderBy: { unlockedAt: "desc" }, take: 4 }),
    db.jobApplication.findMany({ where: { userId }, select: { furthest: true, appliedAt: true } }),
  ]);

  const sprintDone = sprint?.tasks.filter((t) => t.status === "DONE").length ?? 0;
  const sprintTotal = sprint?.tasks.length ?? 0;
  const pipelineValue = openLeads.reduce((sum, l) => sum + Number(l.value ?? 0), 0);
  const goals = buildGoalProgress(metrics, targets);
  const revenueGoal = goals.find((g) => g.key === "business_revenue_brl")!;
  const usdGoal = goals.find((g) => g.key === "employment_income_usd")!;

  // Funnel counts every application that reached each stage, even if closed later
  const stageIndex = (s: string) => APPLICATION_STATUSES.findIndex((x) => x.value === s);
  const funnel = APPLICATION_STATUSES.filter((s) => !["SAVED", "CLOSED"].includes(s.value)).map((stage) => ({
    label: stage.label,
    value: applications.filter((a) => a.appliedAt && stageIndex(a.furthest) >= stageIndex(stage.value)).length,
  }));

  return (
    <>
      <header className="mb-8">
        <p className="text-sm text-muted">{formatLongDate(now)}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {greeting(now)}, {firstName} 👋
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          {user.title}
          {sprint && (
            <>
              <span className="text-line">|</span>
              <span>
                Current Sprint: <span className="font-medium text-ink">{sprint.name}</span>
              </span>
            </>
          )}
        </p>
      </header>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="sm:col-span-2">
          <Eyebrow>Today&apos;s focus</Eyebrow>
          {focus ? (
            <Link href="/work" className="mt-2 block">
              <p className="font-mono text-xs font-semibold text-accent">
                {taskCode(focus.number)} · {focus.project?.name ?? "No project"}
              </p>
              <p className="mt-1 text-lg font-semibold leading-snug hover:underline">{focus.title}</p>
              <Badge tone="accent" className="mt-2">
                In progress
              </Badge>
            </Link>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Nothing in progress. <Link href="/today" className="text-accent hover:underline">Open your Daily →</Link>
            </p>
          )}
        </Card>
        <Kpi label="Sprint" value={`${sprintDone} / ${sprintTotal}`} hint="tickets completed" progress={percent(sprintDone, sprintTotal)} />
        <Kpi
          label="Worked this week"
          value={formatDuration(weekSeconds)}
          hint={`of ${WEEKLY_TARGETS.hours}h`}
          progress={percent(weekSeconds / 3600, WEEKLY_TARGETS.hours)}
        />
        <Kpi label="Development" value={commits ? commits.count : "—"} hint={user.githubUsername ? "commits this week" : "set GitHub in Settings"} />
        <Kpi
          label="Applications"
          value={`${appsThisWeek} / ${WEEKLY_TARGETS.applications}`}
          hint="this week"
          progress={percent(appsThisWeek, WEEKLY_TARGETS.applications)}
        />
        <Kpi label="Leads contacted" value={`${leadsThisWeek} / ${WEEKLY_TARGETS.leads}`} hint="this week" progress={percent(leadsThisWeek, WEEKLY_TARGETS.leads)} />
        <Kpi label="Pipeline" value={formatMoney(pipelineValue)} hint={`${openLeads.length} open leads`} />
      </div>

      {/* Money */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <MoneyCard
          label="Business — Lavínia Ferraz | Soluções Digitais"
          value={formatMoney(revenueGoal.actual)}
          target={formatMoney(revenueGoal.target)}
          percent={revenueGoal.percent}
        />
        <MoneyCard
          label="Employment — International Full Stack Developer"
          value={formatMoney(usdGoal.actual, "USD")}
          target={formatMoney(usdGoal.target, "USD")}
          percent={usdGoal.percent}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Full Stack journey" subtitle="Hours of real work per week" />
          <BarsChart data={hours} format="hours" name="Worked" target={WEEKLY_TARGETS.hours} />
        </Card>
        <Card>
          <CardHeader title="International Job Goal" subtitle="Applications that reached each stage" />
          <FunnelChart data={funnel} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={`Goals — ${new Intl.DateTimeFormat("en-US", { month: "long" }).format(now)}`}
            subtitle="Targets vs. what actually happened"
            action={
              <Link href="/settings#goals" className="text-xs text-accent hover:underline">
                Edit goals
              </Link>
            }
          />
          <div className="grid gap-6 md:grid-cols-3">
            {AREAS.filter((a) => a.key !== "FINANCE").map((area) => (
              <div key={area.key}>
                <Eyebrow>{area.label}</Eyebrow>
                <ul className="mt-3 space-y-3.5">
                  {goals
                    .filter((g) => g.area === area.key)
                    .map((g) => (
                      <li key={g.key}>
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="text-ink-soft">{g.label}</span>
                          <span className="whitespace-nowrap font-mono text-xs">
                            {formatMetric(g.actual, g.unit)} / {formatMetric(g.target, g.unit)}
                          </span>
                        </div>
                        <Progress value={g.percent} className="mt-1.5" />
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Activity"
            action={
              <Link href="/today" className="text-xs text-accent hover:underline">
                Today
              </Link>
            }
          />
          <ActivityFeed items={activities} />
        </Card>
      </div>

      {achievements.length > 0 && (
        <Card className="mt-4">
          <CardHeader
            title="Recent achievements"
            action={
              <Link href="/achievements" className="text-xs text-accent hover:underline">
                See all
              </Link>
            }
          />
          <div className="flex flex-wrap gap-3">
            {achievements.map((a) => {
              const def = ACHIEVEMENTS.find((d) => d.key === a.key);
              if (!def) return null;
              return (
                <span key={a.id} className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-sm">
                  <span>{def.emoji}</span>
                  <span className="font-medium text-accent-strong">{def.title}</span>
                </span>
              );
            })}
          </div>
        </Card>
      )}
    </>
  );
}

function Kpi({ label, value, hint, progress }: { label: string; value: React.ReactNode; hint?: string; progress?: number }) {
  return (
    <Card>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      {progress !== undefined && <Progress value={progress} className="mt-3" />}
    </Card>
  );
}

function MoneyCard({ label, value, target, percent }: { label: string; value: string; target: string; percent: number }) {
  return (
    <Card className="bg-sidebar text-white">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-ink/60">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
        <span className="text-sm text-sidebar-ink/60">/ {target} this month</span>
      </div>
      <Progress value={percent} className="mt-4 bg-white/10" />
      <p className="mt-2 text-xs text-sidebar-ink/60">Only money that actually came in counts.</p>
    </Card>
  );
}

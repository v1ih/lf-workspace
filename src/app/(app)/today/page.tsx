import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { dateOnly, formatLongDate, formatTime, localDateKey, todayRange } from "@/lib/dates";
import { secondsTracked } from "@/lib/metrics";
import { getWeeklyCommits } from "@/lib/github";
import { formatDuration, percent, taskCode } from "@/lib/utils";
import { TASK_TYPES } from "@/lib/labels";
import { endWorkday, startWorkday } from "@/actions/workday";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { CopyButton } from "@/components/copy-button";
import { ActivityFeed } from "@/components/activity-feed";

export const metadata: Metadata = { title: "Today" };

const PRIORITY_ORDER = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

export default async function TodayPage() {
  const user = await getCurrentUser();
  const userId = user.id;
  const now = new Date();
  const today = todayRange(now);
  const yesterday = { start: new Date(today.start.getTime() - 86400000), end: today.start };
  const todayDate = dateOnly(localDateKey(now));

  const [workday, sprint, inProgress, todo, followUpApps, followUpLeads, doneYesterday, doneToday, appsToday, leadsToday, activities] =
    await Promise.all([
      db.workday.findUnique({ where: { userId_date: { userId, date: todayDate } } }),
      db.sprint.findFirst({ where: { userId, status: "ACTIVE" }, include: { tasks: { select: { status: true } } } }),
      db.task.findMany({ where: { userId, status: "IN_PROGRESS" }, include: { project: true }, orderBy: { updatedAt: "desc" } }),
      db.task.findMany({
        where: { userId, status: "TODO", sprint: { status: "ACTIVE" } },
        include: { project: true },
        orderBy: { position: "asc" },
      }),
      db.jobApplication.findMany({ where: { userId, followUpAt: { lte: todayDate }, status: { notIn: ["CLOSED", "OFFER"] } } }),
      db.lead.findMany({ where: { userId, nextFollowUp: { lte: todayDate }, stage: { notIn: ["WON", "LOST"] } } }),
      db.task.findMany({ where: { userId, completedAt: { gte: yesterday.start, lt: yesterday.end } } }),
      db.task.findMany({ where: { userId, completedAt: { gte: today.start, lt: today.end } } }),
      db.jobApplication.count({ where: { userId, appliedAt: todayDate } }),
      db.lead.count({ where: { userId, contactedAt: { gte: today.start, lt: today.end } } }),
      db.activityLog.findMany({ where: { userId, createdAt: { gte: today.start } }, orderBy: { createdAt: "desc" } }),
    ]);

  const [secondsYesterday, secondsToday, commits] = await Promise.all([
    secondsTracked(userId, yesterday),
    secondsTracked(userId, today),
    getWeeklyCommits(user.githubUsername, today.start),
  ]);

  const sortedTodo = [...todo].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const priority = inProgress[0] ?? sortedTodo[0];
  const nextUp = [...inProgress.slice(1), ...sortedTodo.filter((t) => t.id !== priority?.id)].slice(0, 3);
  const sprintDone = sprint?.tasks.filter((t) => t.status === "DONE").length ?? 0;
  const sprintTotal = sprint?.tasks.length ?? 0;
  const sprintProgress = percent(sprintDone, sprintTotal);

  const dateLabel = formatLongDate(now);
  const yesterdayLine =
    doneYesterday.length || secondsYesterday
      ? `${formatDuration(secondsYesterday)} worked · ${doneYesterday.length} ticket(s) completed`
      : "—";

  const dailyText = [
    `Daily — ${dateLabel}`,
    `Yesterday: ${yesterdayLine}`,
    `Today's Sprint Goal: ${sprint?.goal ?? "—"}`,
    `Priority: ${priority ? `${taskCode(priority.number)} · ${priority.title}` : "—"}`,
    "Expected delivery: PR ready for review.",
    `Secondary: ${followUpApps.length} application follow-up(s)`,
    `Founder task: ${followUpLeads.length ? `follow up with ${followUpLeads.map((l) => l.company).join(", ")}` : "contact 1 potential client"}`,
  ].join("\n");

  const eodText = [
    `End of Day — ${dateLabel}`,
    `${formatDuration(secondsToday)} worked`,
    `${doneToday.length} ticket(s) completed${doneToday.length ? `: ${doneToday.map((t) => taskCode(t.number)).join(", ")}` : ""}`,
    `${commits ? commits.count : "?"} commit(s)`,
    `${appsToday} application(s)`,
    `${leadsToday} lead(s) contacted`,
    `Sprint progress: ${sprintProgress}%`,
  ].join("\n");

  return (
    <>
      <PageHeader
        title={`Daily — ${dateLabel}`}
        subtitle={
          workday
            ? workday.endedAt
              ? `Workday closed at ${formatTime(workday.endedAt)}.`
              : `Workday started at ${formatTime(workday.startedAt)}.`
            : "You haven't started your workday yet."
        }
        actions={
          !workday && (
            <form action={startWorkday}>
              <button className={buttonClass("primary")}>Start workday</button>
            </form>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Daily" subtitle="Your plan for today" action={<CopyButton text={dailyText} label="Copy daily" />} />
          <dl className="divide-y divide-line text-sm">
            <Row label="Yesterday">{yesterdayLine}</Row>
            <Row label="Sprint goal">{sprint ? `${sprint.goal ?? sprint.name}` : <Link href="/sprints" className="text-accent">Create a sprint →</Link>}</Row>
            <Row label="Priority">
              {priority ? (
                <Link href="/work" className="group">
                  <span className="font-mono text-xs font-semibold text-accent">{taskCode(priority.number)}</span>{" "}
                  <span className="font-medium group-hover:underline">{priority.title}</span>
                  <span className="ml-2 inline-flex gap-1 align-middle">
                    {priority.project && <Badge>{priority.project.name}</Badge>}
                    <Badge tone="accent">{TASK_TYPES[priority.type]}</Badge>
                  </span>
                </Link>
              ) : (
                "No open tickets — plan your sprint."
              )}
            </Row>
            <Row label="Expected delivery">PR ready for review.</Row>
            <Row label="Next up">
              {nextUp.length ? (
                <ul className="space-y-1">
                  {nextUp.map((t) => (
                    <li key={t.id}>
                      <span className="font-mono text-xs text-muted">{taskCode(t.number)}</span> {t.title}
                    </li>
                  ))}
                </ul>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Career">
              {followUpApps.length
                ? `${followUpApps.length} application follow-up(s): ${followUpApps.map((a) => a.company).join(", ")}`
                : "Send at least 1 international application."}
            </Row>
            <Row label="Founder task">
              {followUpLeads.length
                ? `Follow up with ${followUpLeads.map((l) => l.company).join(", ")}`
                : "Contact 1 potential client."}
            </Row>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Sprint" subtitle={sprint?.name ?? "No active sprint"} />
          <p className="text-3xl font-semibold tracking-tight">{sprintProgress}%</p>
          <p className="mt-1 text-xs text-muted">
            {sprintDone} of {sprintTotal} tickets done
          </p>
          <Progress value={sprintProgress} className="mt-4" />
          <div className="mt-6">
            <Eyebrow>Today so far</Eyebrow>
            <p className="mt-1 text-2xl font-semibold">{formatDuration(secondsToday)}</p>
          </div>
        </Card>

        <Card id="end-of-day" className="scroll-mt-24 lg:col-span-2">
          <CardHeader
            title="End of Day"
            subtitle="Real numbers from today"
            action={<CopyButton text={eodText} label="Copy report" />}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Worked" value={formatDuration(secondsToday)} />
            <Stat label="Tickets completed" value={doneToday.length} />
            <Stat label="Commits" value={commits ? commits.count : "—"} hint={user.githubUsername ? `@${user.githubUsername}` : "Set GitHub in Settings"} />
            <Stat label="Applications" value={appsToday} />
            <Stat label="Leads contacted" value={leadsToday} />
            <Stat label="Sprint progress" value={`${sprintProgress}%`} />
          </div>

          {workday && !workday.endedAt ? (
            <form action={endWorkday} className="mt-5 space-y-3">
              <Textarea name="notes" placeholder="Notes: what went well, blockers, what's next…" />
              <button className={buttonClass("dark")}>End workday</button>
            </form>
          ) : workday?.notes ? (
            <p className="mt-5 whitespace-pre-line rounded-xl bg-sunken p-4 text-sm text-ink-soft">{workday.notes}</p>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Today's activity" />
          <ActivityFeed items={activities} empty="Nothing yet today." />
        </Card>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl bg-sunken/70 p-3">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

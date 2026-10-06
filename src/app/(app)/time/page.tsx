import type { Metadata } from "next";
import { Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { formatLongDate, formatTime, localDateKey, monthRange, todayRange, weekRange } from "@/lib/dates";
import { entrySeconds, formatDuration, taskCode } from "@/lib/utils";
import { addManualEntry, deleteTimeEntry } from "@/actions/time";
import { PageHeader } from "@/components/page-header";
import { Card, Eyebrow } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { Empty } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Time Tracking" };

export default async function TimePage() {
  const user = await getCurrentUser();
  const now = new Date();
  const month = monthRange(now);
  const week = weekRange(now);
  const today = todayRange(now);

  const [entries, tasks, projects] = await Promise.all([
    db.timeEntry.findMany({
      where: { userId: user.id, startedAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
      include: { task: true, project: true },
      orderBy: { startedAt: "desc" },
    }),
    db.task.findMany({ where: { userId: user.id, status: { not: "DONE" } }, orderBy: { number: "asc" } }),
    db.project.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  const sumIn = (range: { start: Date; end: Date }) =>
    entries.filter((e) => e.startedAt >= range.start && e.startedAt < range.end).reduce((s, e) => s + entrySeconds(e), 0);

  // Group entries by local day
  const days = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = localDateKey(e.startedAt);
    days.set(key, [...(days.get(key) ?? []), e]);
  }

  return (
    <>
      <PageHeader
        title="Time Tracking"
        subtitle="Use ▶ Start on a task, or add time you forgot to track."
        actions={
          <FormDialog
            title="Add time manually"
            trigger={
              <>
                <Plus className="size-4" /> Add time
              </>
            }
            action={addManualEntry}
          >
            <FormGrid className="sm:grid-cols-3">
              <Field label="Date">
                <Input name="date" type="date" required defaultValue={localDateKey(now)} />
              </Field>
              <Field label="Start">
                <Input name="start" type="time" required defaultValue="09:00" />
              </Field>
              <Field label="End">
                <Input name="end" type="time" required defaultValue="12:00" />
              </Field>
            </FormGrid>
            <Field label="Task">
              <Select name="taskId" defaultValue="">
                <option value="">No task</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {taskCode(t.number)} · {t.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Project" hint="Filled from the task when empty">
              <Select name="projectId" defaultValue="">
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Description">
              <Input name="description" placeholder="What did you work on?" />
            </Field>
          </FormDialog>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Today", sumIn(today)],
          ["This week", sumIn(week)],
          ["This month", sumIn(month)],
        ].map(([label, seconds]) => (
          <Card key={label as string}>
            <Eyebrow>{label}</Eyebrow>
            <p className="mt-2 text-2xl font-semibold">{formatDuration(seconds as number)}</p>
          </Card>
        ))}
      </div>

      {days.size === 0 && <Empty title="No time tracked in the last 30 days">Press ▶ Start timer at the top to begin.</Empty>}

      <div className="space-y-4">
        {[...days.entries()].map(([day, list]) => (
          <Card key={day} className="p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="text-sm font-semibold">{formatLongDate(list[0].startedAt)}</h2>
              <span className="font-mono text-sm">{formatDuration(list.reduce((s, e) => s + entrySeconds(e), 0))}</span>
            </div>
            <ul className="divide-y divide-line">
              {list.map((e) => (
                <li key={e.id} className="flex items-center gap-4 px-5 py-2.5 text-sm">
                  <span className="w-28 shrink-0 font-mono text-xs text-muted">
                    {formatTime(e.startedAt)} – {e.endedAt ? formatTime(e.endedAt) : "now"}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {e.task ? (
                      <>
                        <span className="font-mono text-xs text-accent">{taskCode(e.task.number)}</span> {e.task.title}
                      </>
                    ) : (
                      (e.description ?? "—")
                    )}
                  </span>
                  {e.project && <span className="hidden text-xs text-muted sm:inline">{e.project.name}</span>}
                  <span className="w-14 text-right font-mono text-xs">{e.endedAt ? formatDuration(entrySeconds(e)) : "●"}</span>
                  <form action={deleteTimeEntry.bind(null, e.id)}>
                    <button className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-700" aria-label="Delete entry">
                      <Trash2 className="size-3.5" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}

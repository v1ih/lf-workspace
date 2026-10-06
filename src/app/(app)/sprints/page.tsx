import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { formatShortDate, toInputDate } from "@/lib/dates";
import { SPRINT_STATUSES } from "@/lib/labels";
import { percent, taskCode } from "@/lib/utils";
import { saveSprint } from "@/actions/settings";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FormDialog } from "@/components/ui/form-dialog";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Empty } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Sprints" };

type SprintValues = { id?: string; name?: string; goal?: string | null; startDate?: Date; endDate?: Date; status?: string };

function SprintFields({ values = {} }: { values?: SprintValues }) {
  return (
    <>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <Field label="Name">
        <Input name="name" required defaultValue={values.name} placeholder="Sprint 02 — …" />
      </Field>
      <Field label="Sprint goal">
        <Textarea name="goal" rows={2} defaultValue={values.goal ?? ""} />
      </Field>
      <FormGrid className="sm:grid-cols-3">
        <Field label="Start">
          <Input name="startDate" type="date" required defaultValue={toInputDate(values.startDate)} />
        </Field>
        <Field label="End">
          <Input name="endDate" type="date" required defaultValue={toInputDate(values.endDate)} />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={values.status ?? "PLANNED"}>
            {Object.entries(SPRINT_STATUSES).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </FormGrid>
    </>
  );
}

export default async function SprintsPage() {
  const user = await getCurrentUser();
  const sprints = await db.sprint.findMany({
    where: { userId: user.id },
    include: { tasks: { orderBy: { number: "asc" } } },
    orderBy: { startDate: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Sprints"
        subtitle="Short cycles with one clear goal. Only one sprint is active at a time."
        actions={
          <FormDialog
            title="Plan a sprint"
            trigger={
              <>
                <Plus className="size-4" /> New sprint
              </>
            }
            action={saveSprint}
          >
            <SprintFields />
          </FormDialog>
        }
      />

      {sprints.length === 0 && <Empty title="No sprints yet">Plan your first sprint to organize the week.</Empty>}

      <div className="space-y-4">
        {sprints.map((sprint) => {
          const done = sprint.tasks.filter((t) => t.status === "DONE").length;
          const status = SPRINT_STATUSES[sprint.status];
          return (
            <Card key={sprint.id} className={sprint.status === "ACTIVE" ? "border-accent/40" : undefined}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{sprint.name}</h2>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatShortDate(sprint.startDate, { utc: true })} – {formatShortDate(sprint.endDate, { utc: true })}
                  </p>
                  {sprint.goal && <p className="mt-2 text-sm text-ink-soft">🎯 {sprint.goal}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/work?sprint=${sprint.id}`} className="text-xs text-accent hover:underline">
                    Open board →
                  </Link>
                  <FormDialog
                    title={`Edit ${sprint.name}`}
                    trigger={<Pencil className="size-3.5" />}
                    triggerProps={{ variant: "ghost", size: "icon", "aria-label": "Edit sprint" }}
                    action={saveSprint}
                  >
                    <SprintFields values={sprint} />
                  </FormDialog>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Progress value={percent(done, sprint.tasks.length)} className="flex-1" />
                <span className="text-xs text-muted">
                  {done}/{sprint.tasks.length} done
                </span>
              </div>

              {sprint.tasks.length > 0 && (
                <ul className="mt-4 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  {sprint.tasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <span className={t.status === "DONE" ? "text-emerald-600" : "text-line"}>●</span>
                      <span className="font-mono text-xs text-muted">{taskCode(t.number)}</span>
                      <span className={t.status === "DONE" ? "truncate text-muted line-through" : "truncate"}>{t.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

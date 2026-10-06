import type { Metadata } from "next";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { formatShortDate, localDateKey, toInputDate, toInputDateTime } from "@/lib/dates";
import { APPLICATION_STATUSES } from "@/lib/labels";
import { cn, formatMoney } from "@/lib/utils";
import { deleteApplication, moveApplication, saveApplication } from "@/actions/career";
import { PageHeader } from "@/components/page-header";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/ui/form-dialog";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Empty } from "@/components/ui/empty";
import { StageSelect } from "@/components/stage-select";

export const metadata: Metadata = { title: "Applications" };

type AppValues = {
  id?: string;
  company?: string;
  position?: string;
  country?: string | null;
  salary?: unknown;
  currency?: string;
  remote?: boolean;
  technology?: string | null;
  url?: string | null;
  status?: string;
  appliedAt?: Date | null;
  interviewAt?: Date | null;
  followUpAt?: Date | null;
  notes?: string | null;
};

function ApplicationFields({ values = {} }: { values?: AppValues }) {
  return (
    <>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <FormGrid>
        <Field label="Company">
          <Input name="company" required defaultValue={values.company} />
        </Field>
        <Field label="Position">
          <Input name="position" required placeholder="Full Stack Developer" defaultValue={values.position} />
        </Field>
        <Field label="Country">
          <Input name="country" placeholder="USA, Portugal, Canada…" defaultValue={values.country ?? ""} />
        </Field>
        <Field label="Technology">
          <Input name="technology" placeholder="React, Node, TypeScript" defaultValue={values.technology ?? ""} />
        </Field>
        <Field label="Salary (per month)">
          <Input name="salary" type="number" step="1" min="0" defaultValue={values.salary ? String(values.salary) : ""} />
        </Field>
        <Field label="Currency">
          <Select name="currency" defaultValue={values.currency ?? "USD"}>
            <option value="USD">USD</option>
            <option value="BRL">BRL</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={values.status ?? "APPLIED"}>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Applied on" hint="Defaults to today once it's past Saved">
          <Input name="appliedAt" type="date" defaultValue={toInputDate(values.appliedAt)} />
        </Field>
        <Field label="Interview">
          <Input name="interviewAt" type="datetime-local" defaultValue={toInputDateTime(values.interviewAt)} />
        </Field>
        <Field label="Follow up on">
          <Input name="followUpAt" type="date" defaultValue={toInputDate(values.followUpAt)} />
        </Field>
      </FormGrid>
      <Field label="Job link">
        <Input name="url" type="url" defaultValue={values.url ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="remote" defaultChecked={values.remote ?? true} className="size-4" /> Remote
      </label>
      <Field label="Notes">
        <Textarea name="notes" defaultValue={values.notes ?? ""} />
      </Field>
    </>
  );
}

type AppStatus = (typeof APPLICATION_STATUSES)[number]["value"];

const ORDER = APPLICATION_STATUSES.map((s) => s.value as string);
const reached = (furthest: string, stage: string) => ORDER.indexOf(furthest) >= ORDER.indexOf(stage);

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  const apps = await db.jobApplication.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  const today = localDateKey();

  const sent = apps.filter((a) => a.appliedAt);
  const stats = [
    { label: "Applications sent", value: sent.length },
    { label: "Responses", value: sent.filter((a) => reached(a.furthest, "SCREENING")).length },
    { label: "Interviews", value: sent.filter((a) => reached(a.furthest, "INTERVIEW")).length },
    { label: "Technical challenges", value: sent.filter((a) => reached(a.furthest, "TECHNICAL")).length },
    { label: "Offers", value: sent.filter((a) => a.furthest === "OFFER").length },
  ];

  const active = apps.filter((a) => a.status !== "CLOSED");
  const closed = apps.filter((a) => a.status === "CLOSED");
  // Stable numbering: #001 is the first application ever created
  const numberOf = new Map(
    [...apps].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((a, i) => [a.id, String(i + 1).padStart(3, "0")]),
  );

  return (
    <>
      <PageHeader
        title="Job Applications"
        subtitle="A rejection isn't “I didn't get a job”. It's just Application #018 — Closed. Next."
        actions={
          <FormDialog
            title="New application"
            trigger={
              <>
                <Plus className="size-4" /> New application
              </>
            }
            action={saveApplication}
          >
            <ApplicationFields />
          </FormDialog>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <Eyebrow>{s.label}</Eyebrow>
            <p className="mt-2 text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      {apps.length === 0 && <Empty title="No applications yet">Saved → Applied → Screening → Interview → Technical → Offer.</Empty>}

      {active.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-5 py-3 font-semibold">#</th>
                <th className="py-3 font-semibold">Company / position</th>
                <th className="py-3 font-semibold">Country</th>
                <th className="py-3 font-semibold">Salary</th>
                <th className="py-3 font-semibold">Applied</th>
                <th className="py-3 font-semibold">Next step</th>
                <th className="py-3 font-semibold">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {active.map((a) => (
                <ApplicationRow key={a.id} app={a} number={numberOf.get(a.id)!} today={today} />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {closed.length > 0 && (
        <details className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink-soft">Closed ({closed.length}) — next!</summary>
          <ul className="mt-3 divide-y divide-line text-sm">
            {closed.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2">
                <span className="font-mono text-xs text-muted">#{numberOf.get(a.id)}</span>
                <span className="flex-1">
                  {a.company} · <span className="text-muted">{a.position}</span>
                </span>
                <Badge>Reached {APPLICATION_STATUSES.find((s) => s.value === a.furthest)?.label}</Badge>
                <StageSelect id={a.id} value={a.status as AppStatus} options={APPLICATION_STATUSES} onMove={moveApplication} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function ApplicationRow({ app: a, number, today }: { app: AppValues & { id: string; status: string; company: string; position: string }; number: string; today: string }) {
  const overdue = a.followUpAt && toInputDate(a.followUpAt) <= today;
  return (
    <tr className="align-middle">
      <td className="px-5 py-3 font-mono text-xs text-muted">#{number}</td>
      <td className="py-3">
        <p className="font-medium">
          {a.company}
          {a.url && (
            <a href={a.url} target="_blank" rel="noreferrer" className="ml-1.5 inline-block text-muted hover:text-accent" aria-label="Open job post">
              <ExternalLink className="size-3" />
            </a>
          )}
        </p>
        <p className="text-xs text-muted">
          {a.position}
          {a.technology && ` · ${a.technology}`}
        </p>
      </td>
      <td className="py-3 text-xs">
        {a.country ?? "—"} {a.remote && <Badge tone="green">Remote</Badge>}
      </td>
      <td className="py-3 text-xs">{a.salary ? formatMoney(Number(a.salary), a.currency as "USD" | "BRL") : "—"}</td>
      <td className="py-3 text-xs text-muted">{formatShortDate(a.appliedAt, { utc: true })}</td>
      <td className="py-3 text-xs">
        {a.interviewAt ? (
          <span className="font-medium text-violet-700">Interview {formatShortDate(a.interviewAt)}</span>
        ) : a.followUpAt ? (
          <span className={cn(overdue ? "font-semibold text-red-700" : "text-muted")}>Follow up {formatShortDate(a.followUpAt, { utc: true })}</span>
        ) : (
          "—"
        )}
      </td>
      <td className="py-3">
        <StageSelect id={a.id} value={a.status as AppStatus} options={APPLICATION_STATUSES} onMove={moveApplication} />
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-1">
          <FormDialog
            title={`${a.company} — ${a.position}`}
            trigger={<Pencil className="size-3.5" />}
            triggerProps={{ variant: "ghost", size: "icon", "aria-label": "Edit application" }}
            action={saveApplication}
          >
            <ApplicationFields values={a} />
          </FormDialog>
          <form action={deleteApplication.bind(null, a.id)}>
            <button className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700" aria-label="Delete application">
              <Trash2 className="size-3.5" />
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { formatShortDate, formatTime } from "@/lib/dates";
import { CLIENT_STATUSES, labelOf, TASK_STATUSES } from "@/lib/labels";
import { entrySeconds, formatDuration, formatMoney, taskCode } from "@/lib/utils";
import { saveClient } from "@/actions/business";
import { Card, CardHeader, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/ui/form-dialog";
import { ClientFields } from "../client-fields";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();

  // Filtering by userId too: a client id from someone else simply 404s
  const client = await db.client.findFirst({
    where: { id, userId: user.id },
    include: {
      projects: {
        include: {
          tasks: { orderBy: { number: "desc" } },
          timeEntries: { include: { task: true }, orderBy: { startedAt: "desc" } },
        },
      },
      transactions: { orderBy: { date: "desc" } },
    },
  });
  if (!client) notFound();

  const entries = client.projects.flatMap((p) => p.timeEntries).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  const tasks = client.projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectName: p.name })));
  const seconds = entries.reduce((s, e) => s + entrySeconds(e), 0);
  const received = client.transactions.filter((t) => t.status === "RECEIVED" && t.currency === "BRL").reduce((s, t) => s + Number(t.amount), 0);
  const expected = client.transactions.filter((t) => t.status === "EXPECTED" && t.currency === "BRL").reduce((s, t) => s + Number(t.amount), 0);
  const effectiveRate = seconds > 0 ? received / (seconds / 3600) : null;
  const status = CLIENT_STATUSES[client.status];

  return (
    <>
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1 text-xs text-muted hover:text-accent">
        <ArrowLeft className="size-3" /> Clients
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {client.segment ?? "—"} · {client.country}
          </p>
        </div>
        <FormDialog
          title={`Edit ${client.name}`}
          trigger={
            <>
              <Pencil className="size-3.5" /> Edit
            </>
          }
          triggerProps={{ variant: "secondary" }}
          action={saveClient}
        >
          <ClientFields values={client} />
        </FormDialog>
      </header>

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Hours worked" value={formatDuration(seconds)} />
        <Stat label="Received" value={formatMoney(received)} />
        <Stat label="Receivable" value={formatMoney(expected)} />
        <Stat
          label="Effective rate"
          value={effectiveRate ? `${formatMoney(effectiveRate)}/h` : "—"}
          hint={client.hourlyRate ? `Agreed: ${formatMoney(Number(client.hourlyRate))}/h` : "received ÷ hours"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tasks" subtitle={client.projects.map((p) => p.name).join(" · ") || "No projects"} />
          {tasks.length ? (
            <ul className="divide-y divide-line text-sm">
              {tasks.slice(0, 12).map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <span className="font-mono text-xs text-muted">{taskCode(t.number)}</span>
                  <span className="flex-1 truncate">{t.title}</span>
                  <Badge tone={t.status === "DONE" ? "green" : "neutral"}>{labelOf(TASK_STATUSES, t.status)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No tasks yet.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Payments" />
          {client.transactions.length ? (
            <ul className="divide-y divide-line text-sm">
              {client.transactions.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <span className="w-14 text-xs text-muted">{formatShortDate(t.date, { utc: true })}</span>
                  <span className="flex-1 truncate">{t.description}</span>
                  <span className="font-medium">{formatMoney(Number(t.amount), t.currency)}</span>
                  <Badge tone={t.status === "RECEIVED" ? "green" : "amber"}>{t.status === "RECEIVED" ? "Received" : "Expected"}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              No payments yet. <Link href="/finance" className="text-accent hover:underline">Add one in Finance →</Link>
            </p>
          )}
        </Card>

        <Card>
          <CardHeader title="Hours" />
          {entries.length ? (
            <ul className="divide-y divide-line text-sm">
              {entries.slice(0, 12).map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2">
                  <span className="w-24 text-xs text-muted">
                    {formatShortDate(e.startedAt)} {formatTime(e.startedAt)}
                  </span>
                  <span className="flex-1 truncate">{e.task ? `${taskCode(e.task.number)} · ${e.task.title}` : (e.description ?? "—")}</span>
                  <span className="font-mono text-xs">{formatDuration(entrySeconds(e))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No hours tracked yet.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Notes" />
          <p className="whitespace-pre-line text-sm text-ink-soft">{client.notes ?? "—"}</p>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

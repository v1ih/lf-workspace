import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { CLIENT_STATUSES } from "@/lib/labels";
import { entrySeconds, formatDuration, formatMoney } from "@/lib/utils";
import { saveClient } from "@/actions/business";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormDialog } from "@/components/ui/form-dialog";
import { Empty } from "@/components/ui/empty";
import { ClientFields } from "./client-fields";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const user = await getCurrentUser();
  const clients = await db.client.findMany({
    where: { userId: user.id },
    include: {
      projects: { include: { timeEntries: { select: { startedAt: true, endedAt: true } } } },
      transactions: { where: { status: "RECEIVED", currency: "BRL" }, select: { amount: true } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={user.companyName}
        actions={
          <FormDialog
            title="New client"
            trigger={
              <>
                <Plus className="size-4" /> New client
              </>
            }
            action={saveClient}
          >
            <ClientFields />
          </FormDialog>
        }
      />

      {clients.length === 0 && <Empty title="No clients yet">Win a lead in the CRM and it becomes a client automatically.</Empty>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients.map((c) => {
          const seconds = c.projects.flatMap((p) => p.timeEntries).reduce((s, e) => s + entrySeconds(e), 0);
          const received = c.transactions.reduce((s, t) => s + Number(t.amount), 0);
          const status = CLIENT_STATUSES[c.status];
          return (
            <Link key={c.id} href={`/clients/${c.id}`} className="group">
              <Card className="h-full transition group-hover:border-accent/40">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold group-hover:text-accent">{c.name}</h2>
                    <p className="text-xs text-muted">{c.segment ?? "—"}</p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <Mini label="Projects" value={c.projects.length} />
                  <Mini label="Hours" value={formatDuration(seconds)} />
                  <Mini label="Received" value={formatMoney(received)} />
                </dl>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-sunken/70 px-2 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
    </div>
  );
}

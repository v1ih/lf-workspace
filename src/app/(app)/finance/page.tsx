import type { Metadata } from "next";
import { Check, Plus, Repeat, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { formatShortDate, localDateKey, monthKey } from "@/lib/dates";
import { buildGoalProgress } from "@/lib/goals";
import { computeMonthMetrics, getGoalTargets } from "@/lib/metrics";
import { monthlyIncome } from "@/lib/series";
import { formatMoney } from "@/lib/utils";
import { deleteTransaction, markReceived, saveTransaction } from "@/actions/business";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FormDialog } from "@/components/ui/form-dialog";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { Empty } from "@/components/ui/empty";
import { TrendChart } from "@/components/charts";

export const metadata: Metadata = { title: "Finance" };

export default async function FinancePage() {
  const user = await getCurrentUser();
  const period = monthKey();

  const [metrics, targets, transactions, clients] = await Promise.all([
    computeMonthMetrics(user.id, period),
    getGoalTargets(user.id, period),
    db.transaction.findMany({ where: { userId: user.id }, include: { client: true }, orderBy: { date: "desc" }, take: 60 }),
    db.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const goals = buildGoalProgress(metrics, targets);
  const business = goals.find((g) => g.key === "business_revenue_brl")!;
  const employment = goals.find((g) => g.key === "employment_income_usd")!;

  const [businessSeries, employmentSeries] = await Promise.all([
    monthlyIncome(user.id, { stream: "BUSINESS", currency: "BRL", target: business.target }),
    monthlyIncome(user.id, { stream: "EMPLOYMENT", currency: "USD", target: employment.target }),
  ]);

  const receivable = transactions.filter((t) => t.status === "EXPECTED");
  const receivableBRL = receivable.filter((t) => t.currency === "BRL").reduce((s, t) => s + Number(t.amount), 0);
  const expectedThisMonth = receivable
    .filter((t) => t.stream === "BUSINESS" && t.currency === "BRL" && t.date.toISOString().startsWith(period))
    .reduce((s, t) => s + Number(t.amount), 0);
  const recurring = transactions
    .filter((t) => t.recurring && t.stream === "BUSINESS" && t.currency === "BRL" && t.date.toISOString().startsWith(period))
    .reduce((s, t) => s + Number(t.amount), 0);
  const activeContracts = await db.client.count({ where: { userId: user.id, status: "ACTIVE" } });

  return (
    <>
      <PageHeader
        title="Finance"
        subtitle="Two independent income streams. Only money that actually came in counts as revenue."
        actions={
          <FormDialog
            title="New transaction"
            trigger={
              <>
                <Plus className="size-4" /> Add income
              </>
            }
            action={saveTransaction}
          >
            <Field label="Description">
              <Input name="description" required placeholder="Mary Bless — monthly maintenance" />
            </Field>
            <FormGrid>
              <Field label="Stream">
                <Select name="stream" defaultValue="BUSINESS">
                  <option value="BUSINESS">Business — {user.companyName}</option>
                  <option value="EMPLOYMENT">Employment — International Developer</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue="RECEIVED">
                  <option value="RECEIVED">Received</option>
                  <option value="EXPECTED">Expected (receivable)</option>
                </Select>
              </Field>
              <Field label="Amount">
                <Input name="amount" type="number" step="0.01" min="0.01" required />
              </Field>
              <Field label="Currency">
                <Select name="currency" defaultValue="BRL">
                  <option value="BRL">BRL — R$</option>
                  <option value="USD">USD — US$</option>
                </Select>
              </Field>
              <Field label="Date">
                <Input name="date" type="date" required defaultValue={localDateKey()} />
              </Field>
              <Field label="Client">
                <Select name="clientId" defaultValue="">
                  <option value="">—</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </FormGrid>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="recurring" className="size-4 accent-[var(--color-accent)]" /> Recurring monthly revenue
            </label>
          </FormDialog>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GoalCard
          stream="EMPLOYMENT"
          title="International Full Stack Developer"
          actual={formatMoney(employment.actual, "USD")}
          target={formatMoney(employment.target, "USD")}
          percent={employment.percent}
        />
        <GoalCard
          stream="BUSINESS"
          title={user.companyName}
          actual={formatMoney(business.actual)}
          target={formatMoney(business.target)}
          percent={business.percent}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Small label="Expected this month" value={formatMoney(expectedThisMonth)} />
        <Small label="Recurring revenue" value={formatMoney(recurring)} />
        <Small label="Active contracts" value={activeContracts} />
        <Small label="Accounts receivable" value={formatMoney(receivableBRL)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Business revenue" subtitle="Received per month vs. goal (dashed)" />
          <TrendChart data={businessSeries} format="brl" names={["Received", "Goal"]} />
        </Card>
        <Card>
          <CardHeader title="Employment income" subtitle="Received per month vs. goal (dashed)" />
          <TrendChart data={employmentSeries} format="usd" names={["Received", "Goal"]} />
        </Card>
      </div>

      <Card className="mt-4 p-0">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold">Transactions</h2>
        </div>
        {transactions.length === 0 ? (
          <div className="p-5">
            <Empty title="No transactions yet">When money comes in, register it here — the goals update automatically.</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {transactions.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5">
                <span className="w-14 text-xs text-muted">{formatShortDate(t.date, { utc: true })}</span>
                <span className="min-w-0 flex-1 truncate">
                  {t.description}
                  {t.client && <span className="text-muted"> · {t.client.name}</span>}
                  {t.recurring && <Repeat className="ml-1.5 inline size-3 text-muted" aria-label="Recurring" />}
                </span>
                <Badge tone={t.stream === "BUSINESS" ? "accent" : "blue"}>{t.stream === "BUSINESS" ? "Business" : "Employment"}</Badge>
                <span className="w-28 text-right font-semibold">{formatMoney(Number(t.amount), t.currency)}</span>
                {t.status === "EXPECTED" ? (
                  <form action={markReceived.bind(null, t.id)}>
                    <button className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-emerald-50 hover:text-emerald-800">
                      <Check className="size-3" /> Mark received
                    </button>
                  </form>
                ) : (
                  <Badge tone="green">Received</Badge>
                )}
                <form action={deleteTransaction.bind(null, t.id)}>
                  <button className="rounded p-1 text-muted hover:text-red-700" aria-label="Delete transaction">
                    <Trash2 className="size-3.5" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function GoalCard({
  stream,
  title,
  actual,
  target,
  percent,
}: {
  stream: "EMPLOYMENT" | "BUSINESS";
  title: string;
  actual: string;
  target: string;
  percent: number;
}) {
  return (
    <Card className="bg-sidebar text-white">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">{stream}</p>
      <p className="mt-1 text-sm text-sidebar-ink/80">{title}</p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-sidebar-ink/50">This month</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{actual}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-sidebar-ink/50">Target</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-sidebar-ink/70">{target}</p>
        </div>
      </div>
      <Progress value={percent} className="mt-5 bg-white/10" />
      <p className="mt-2 text-xs text-sidebar-ink/60">{percent}% of the monthly goal</p>
    </Card>
  );
}

function Small({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </Card>
  );
}

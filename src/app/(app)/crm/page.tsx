import type { Metadata } from "next";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { formatShortDate, localDateKey, toInputDate } from "@/lib/dates";
import { LEAD_STAGES } from "@/lib/labels";
import { cn, formatMoney } from "@/lib/utils";
import { deleteLead, moveLead, saveLead } from "@/actions/business";
import { PageHeader } from "@/components/page-header";
import { Card, Eyebrow } from "@/components/ui/card";
import { FormDialog } from "@/components/ui/form-dialog";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { StageSelect } from "@/components/stage-select";

export const metadata: Metadata = { title: "CRM" };

type LeadValues = {
  id?: string;
  company?: string;
  contactName?: string | null;
  contactInfo?: string | null;
  service?: string | null;
  value?: unknown;
  stage?: string;
  source?: string | null;
  nextFollowUp?: Date | null;
  notes?: string | null;
};

function LeadFields({ values = {} }: { values?: LeadValues }) {
  return (
    <>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <FormGrid>
        <Field label="Company">
          <Input name="company" required defaultValue={values.company} />
        </Field>
        <Field label="Service">
          <Input name="service" placeholder="Website, Nuvemshop, PetHelp…" defaultValue={values.service ?? ""} />
        </Field>
        <Field label="Contact name">
          <Input name="contactName" defaultValue={values.contactName ?? ""} />
        </Field>
        <Field label="Phone / email / Instagram">
          <Input name="contactInfo" defaultValue={values.contactInfo ?? ""} />
        </Field>
        <Field label="Value (R$)">
          <Input name="value" type="number" step="0.01" min="0" defaultValue={values.value ? String(values.value) : ""} />
        </Field>
        <Field label="Stage">
          <Select name="stage" defaultValue={values.stage ?? "LEAD"}>
            {LEAD_STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source">
          <Input name="source" placeholder="Referral, Instagram, Google…" defaultValue={values.source ?? ""} />
        </Field>
        <Field label="Next follow-up">
          <Input name="nextFollowUp" type="date" defaultValue={toInputDate(values.nextFollowUp)} />
        </Field>
      </FormGrid>
      <Field label="Notes">
        <Textarea name="notes" defaultValue={values.notes ?? ""} />
      </Field>
    </>
  );
}

const PIPELINE = LEAD_STAGES.filter((s) => s.value !== "LOST");

export default async function CrmPage() {
  const user = await getCurrentUser();
  const leads = await db.lead.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  const today = localDateKey();

  const count = (stage: string) => leads.filter((l) => l.stage === stage).length;
  const open = leads.filter((l) => !["WON", "LOST"].includes(l.stage));
  const openValue = open.reduce((s, l) => s + Number(l.value ?? 0), 0);
  const lost = leads.filter((l) => l.stage === "LOST");

  return (
    <>
      <PageHeader
        title="CRM"
        subtitle="Think like a company, not like someone waiting for clients to show up."
        actions={
          <FormDialog
            title="New lead"
            trigger={
              <>
                <Plus className="size-4" /> New lead
              </>
            }
            action={saveLead}
          >
            <LeadFields />
          </FormDialog>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Summary label="Open leads" value={open.length} />
        <Summary label="Proposals" value={count("PROPOSAL")} />
        <Summary label="Negotiation" value={count("NEGOTIATION")} />
        <Summary label="Won" value={count("WON")} />
        <Summary label="Pipeline value" value={formatMoney(openValue)} />
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8">
        <div className="grid min-w-[1100px] grid-cols-6 gap-3">
          {PIPELINE.map((stage) => {
            const list = leads.filter((l) => l.stage === stage.value);
            const total = list.reduce((s, l) => s + Number(l.value ?? 0), 0);
            return (
              <div key={stage.value} className="rounded-2xl bg-sunken/70 p-2.5">
                <div className="mb-2 px-1.5 py-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    {stage.label} <span className="font-normal text-muted">· {list.length}</span>
                  </h3>
                  {total > 0 && <p className="text-[11px] text-muted">{formatMoney(total)}</p>}
                </div>
                <div className="space-y-2">
                  {list.map((lead) => {
                    const overdue = lead.nextFollowUp && toInputDate(lead.nextFollowUp) <= today && stage.value !== "WON";
                    return (
                      <article key={lead.id} className="rounded-xl border border-line bg-surface p-3 text-sm">
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-medium leading-snug">{lead.company}</p>
                          <FormDialog
                            title={`Edit ${lead.company}`}
                            trigger={<Pencil className="size-3" />}
                            triggerProps={{ variant: "ghost", size: "icon", className: "size-6", "aria-label": "Edit lead" }}
                            action={saveLead}
                          >
                            <LeadFields values={lead} />
                          </FormDialog>
                        </div>
                        {lead.service && <p className="text-xs text-muted">{lead.service}</p>}
                        {lead.value && <p className="mt-1 text-xs font-semibold">{formatMoney(Number(lead.value))}</p>}
                        {lead.nextFollowUp && (
                          <p className={cn("mt-1.5 inline-flex items-center gap-1 text-[11px]", overdue ? "font-semibold text-red-700" : "text-muted")}>
                            <CalendarClock className="size-3" /> {formatShortDate(lead.nextFollowUp, { utc: true })}
                          </p>
                        )}
                        <StageSelect id={lead.id} value={lead.stage} options={LEAD_STAGES} onMove={moveLead} className="mt-2 w-full" />
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {lost.length > 0 && (
        <details className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink-soft">Lost ({lost.length})</summary>
          <ul className="mt-3 divide-y divide-line text-sm">
            {lost.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2">
                <span className="flex-1">{l.company}</span>
                <StageSelect id={l.id} value={l.stage} options={LEAD_STAGES} onMove={moveLead} />
                <form action={deleteLead.bind(null, l.id)}>
                  <button className="rounded p-1 text-muted hover:text-red-700" aria-label="Delete lead">
                    <Trash2 className="size-3.5" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}

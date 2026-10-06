"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity, syncAchievements } from "@/lib/metrics";
import { formatMoney } from "@/lib/utils";
import { labelOf, LEAD_STAGES } from "@/lib/labels";
import { fail, formObject, success, zodFail, type ActionState } from "@/lib/action-state";
import { refreshAll, requireUserId } from "./_shared";

const money = z.coerce.number().min(0).max(10_000_000);

// ─────────────── Clients ───────────────

const ClientSchema = z.object({
  name: z.string().min(2).max(120),
  segment: z.string().max(120).optional(),
  status: z.enum(["ACTIVE", "DEVELOPMENT", "PAUSED", "CLOSED"]).default("ACTIVE"),
  country: z.string().max(60).default("Brazil"),
  hourlyRate: money.optional(),
  notes: z.string().max(4000).optional(),
});

export async function saveClient(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id")?.toString();
  const parsed = ClientSchema.safeParse(formObject(formData));
  if (!parsed.success) return zodFail(parsed.error);
  const data = { ...parsed.data, segment: parsed.data.segment ?? null, notes: parsed.data.notes ?? null, hourlyRate: parsed.data.hourlyRate ?? null };

  if (id) {
    const { count } = await db.client.updateMany({ where: { id, userId }, data });
    if (!count) return fail("Client not found");
  } else {
    await db.client.create({ data: { ...data, userId } });
    await logActivity(userId, "business", `New client: ${data.name}`);
    await syncAchievements(userId);
  }
  refreshAll();
  return success();
}

// ─────────────── Projects ───────────────

const ProjectSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "SHIPPED", "ARCHIVED"]).default("ACTIVE"),
  clientId: z.string().optional(),
  repoUrl: z.url().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#C0613D"),
});

export async function saveProject(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id")?.toString();
  const parsed = ProjectSchema.safeParse(formObject(formData));
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;
  if (data.clientId && !(await db.client.findFirst({ where: { id: data.clientId, userId } }))) return fail("Invalid client");

  const values = { ...data, clientId: data.clientId ?? null, description: data.description ?? null, repoUrl: data.repoUrl ?? null };

  if (id) {
    const current = await db.project.findFirst({ where: { id, userId } });
    if (!current) return fail("Project not found");
    const shipping = data.status === "SHIPPED" && current.status !== "SHIPPED";
    await db.project.update({
      where: { id },
      data: { ...values, shippedAt: data.status === "SHIPPED" ? (current.shippedAt ?? new Date()) : null },
    });
    if (shipping) await logActivity(userId, "task", `Project shipped: ${data.name} 🚢`);
  } else {
    await db.project.create({ data: { ...values, userId, shippedAt: data.status === "SHIPPED" ? new Date() : null } });
    await logActivity(userId, "task", `New project: ${data.name}`);
  }
  refreshAll();
  return success();
}

// ─────────────── CRM ───────────────

const STAGES = ["LEAD", "CONTACTED", "MEETING", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;

const LeadSchema = z.object({
  company: z.string().min(2).max(120),
  contactName: z.string().max(120).optional(),
  contactInfo: z.string().max(200).optional(),
  service: z.string().max(120).optional(),
  value: money.optional(),
  stage: z.enum(STAGES).default("LEAD"),
  source: z.string().max(80).optional(),
  nextFollowUp: z.iso.date().optional(),
  notes: z.string().max(4000).optional(),
});

/** Timestamps that power the monthly goals (contacted, proposals, new clients). */
function stageTimestamps(stage: string, current?: { contactedAt: Date | null; proposalAt: Date | null; wonAt: Date | null }) {
  const reached = (target: (typeof STAGES)[number]) =>
    stage !== "LOST" && STAGES.indexOf(stage as (typeof STAGES)[number]) >= STAGES.indexOf(target);
  const now = new Date();
  return {
    contactedAt: current?.contactedAt ?? (reached("CONTACTED") ? now : null),
    proposalAt: current?.proposalAt ?? (reached("PROPOSAL") ? now : null),
    wonAt: stage === "WON" ? (current?.wonAt ?? now) : null,
  };
}

export async function saveLead(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id")?.toString();
  const parsed = LeadSchema.safeParse(formObject(formData));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;
  const values = {
    company: d.company,
    contactName: d.contactName ?? null,
    contactInfo: d.contactInfo ?? null,
    service: d.service ?? null,
    value: d.value ?? null,
    source: d.source ?? null,
    notes: d.notes ?? null,
    nextFollowUp: d.nextFollowUp ? new Date(d.nextFollowUp) : null,
  };

  if (id) {
    const current = await db.lead.findFirst({ where: { id, userId } });
    if (!current) return fail("Lead not found");
    await db.lead.update({ where: { id }, data: { ...values, stage: d.stage, ...stageTimestamps(d.stage, current) } });
    if (current.stage !== d.stage) await afterLeadStage(userId, id, d.company, d.stage);
  } else {
    const lead = await db.lead.create({ data: { ...values, userId, stage: d.stage, ...stageTimestamps(d.stage) } });
    await logActivity(userId, "business", `New lead: ${d.company}${d.value ? ` · ${formatMoney(d.value)}` : ""}`);
    if (d.stage !== "LEAD") await afterLeadStage(userId, lead.id, d.company, d.stage);
  }
  refreshAll();
  return success();
}

/** Used by the pipeline's move buttons. */
export async function moveLead(id: string, stage: (typeof STAGES)[number]) {
  const userId = await requireUserId();
  if (!STAGES.includes(stage)) return;
  const current = await db.lead.findFirst({ where: { id, userId } });
  if (!current || current.stage === stage) return;
  await db.lead.update({ where: { id }, data: { stage, ...stageTimestamps(stage, current) } });
  await afterLeadStage(userId, id, current.company, stage);
  refreshAll();
}

export async function deleteLead(id: string) {
  const userId = await requireUserId();
  await db.lead.deleteMany({ where: { id, userId } });
  refreshAll();
}

async function afterLeadStage(userId: string, leadId: string, company: string, stage: string) {
  await logActivity(userId, "business", `Lead ${company} moved to ${labelOf(LEAD_STAGES, stage)}`);
  if (stage !== "WON") return;

  // Winning a lead creates the client automatically
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (lead && !lead.clientId) {
    const client = await db.client.create({
      data: { userId, name: company, segment: lead.service, status: "ACTIVE", notes: lead.notes },
    });
    await db.lead.update({ where: { id: leadId }, data: { clientId: client.id } });
    await logActivity(userId, "business", `🤝 ${company} is now a client`);
  }
  await syncAchievements(userId);
}

// ─────────────── Finance ───────────────

const TransactionSchema = z.object({
  description: z.string().min(2).max(160),
  amount: money.refine((v) => v > 0, "Amount must be greater than zero"),
  currency: z.enum(["BRL", "USD"]).default("BRL"),
  stream: z.enum(["EMPLOYMENT", "BUSINESS"]),
  status: z.enum(["RECEIVED", "EXPECTED"]).default("RECEIVED"),
  date: z.iso.date(),
  clientId: z.string().optional(),
  recurring: z.literal("on").optional(),
});

export async function saveTransaction(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id")?.toString();
  const parsed = TransactionSchema.safeParse(formObject(formData));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;
  if (d.clientId && !(await db.client.findFirst({ where: { id: d.clientId, userId } }))) return fail("Invalid client");

  const values = {
    description: d.description,
    amount: d.amount,
    currency: d.currency,
    stream: d.stream,
    status: d.status,
    date: new Date(d.date),
    clientId: d.clientId ?? null,
    recurring: d.recurring === "on",
  };

  if (id) {
    const { count } = await db.transaction.updateMany({ where: { id, userId }, data: values });
    if (!count) return fail("Transaction not found");
  } else {
    await db.transaction.create({ data: { ...values, userId } });
    if (d.status === "RECEIVED") {
      await logActivity(userId, "finance", `💰 Received ${formatMoney(d.amount, d.currency)} · ${d.description}`);
    }
  }
  await syncAchievements(userId);
  refreshAll();
  return success();
}

export async function markReceived(id: string) {
  const userId = await requireUserId();
  const tx = await db.transaction.findFirst({ where: { id, userId } });
  if (!tx || tx.status === "RECEIVED") return;
  await db.transaction.update({ where: { id }, data: { status: "RECEIVED" } });
  await logActivity(userId, "finance", `💰 Received ${formatMoney(Number(tx.amount), tx.currency)} · ${tx.description}`);
  await syncAchievements(userId);
  refreshAll();
}

export async function deleteTransaction(id: string) {
  const userId = await requireUserId();
  await db.transaction.deleteMany({ where: { id, userId } });
  refreshAll();
}

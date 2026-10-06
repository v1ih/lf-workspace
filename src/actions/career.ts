"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity, syncAchievements } from "@/lib/metrics";
import { APPLICATION_STATUSES, labelOf } from "@/lib/labels";
import { dateOnly, fromLocalDateTime, localDateKey } from "@/lib/dates";
import { fail, formObject, success, zodFail, type ActionState } from "@/lib/action-state";
import { refreshAll, requireUserId } from "./_shared";

const STATUSES = ["SAVED", "APPLIED", "SCREENING", "INTERVIEW", "TECHNICAL", "OFFER", "CLOSED"] as const;
type Status = (typeof STATUSES)[number];

const ApplicationSchema = z.object({
  company: z.string().min(2).max(120),
  position: z.string().min(2).max(120),
  country: z.string().max(60).optional(),
  salary: z.coerce.number().min(0).max(1_000_000).optional(),
  currency: z.enum(["USD", "BRL"]).default("USD"),
  remote: z.literal("on").optional(),
  technology: z.string().max(200).optional(),
  url: z.url().optional(),
  status: z.enum(STATUSES).default("SAVED"),
  appliedAt: z.iso.date().optional(),
  interviewAt: z.iso.datetime({ local: true }).optional(),
  followUpAt: z.iso.date().optional(),
  notes: z.string().max(4000).optional(),
});

const rank = (s: Status) => STATUSES.indexOf(s);

/** Keeps the funnel honest: remembers the furthest stage and when key stages happened. */
function progressFields(status: Status, current?: { furthest: Status; appliedAt: Date | null; technicalAt: Date | null; offerAt: Date | null }) {
  const furthest =
    status === "CLOSED" ? (current?.furthest ?? "SAVED") : rank(status) > rank(current?.furthest ?? "SAVED") ? status : (current?.furthest ?? status);
  const now = new Date();
  return {
    furthest,
    technicalAt: current?.technicalAt ?? (rank(furthest) >= rank("TECHNICAL") ? now : null),
    offerAt: current?.offerAt ?? (furthest === "OFFER" ? now : null),
  };
}

export async function saveApplication(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id")?.toString();
  const parsed = ApplicationSchema.safeParse(formObject(formData));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;

  // Anything past "Saved" means it was sent — default the applied date to today
  const appliedAt = d.appliedAt ? new Date(d.appliedAt) : d.status !== "SAVED" ? dateOnly(localDateKey()) : null;
  const values = {
    company: d.company,
    position: d.position,
    country: d.country ?? null,
    salary: d.salary ?? null,
    currency: d.currency,
    remote: d.remote === "on",
    technology: d.technology ?? null,
    url: d.url ?? null,
    status: d.status,
    interviewAt: d.interviewAt ? fromLocalDateTime(d.interviewAt) : null,
    followUpAt: d.followUpAt ? new Date(d.followUpAt) : null,
    notes: d.notes ?? null,
  };

  if (id) {
    const current = await db.jobApplication.findFirst({ where: { id, userId } });
    if (!current) return fail("Application not found");
    await db.jobApplication.update({
      where: { id },
      data: { ...values, appliedAt: appliedAt ?? current.appliedAt, ...progressFields(d.status, current) },
    });
    if (current.status !== d.status) await afterStatus(userId, d.company, d.status);
  } else {
    const count = await db.jobApplication.count({ where: { userId } });
    await db.jobApplication.create({ data: { ...values, userId, appliedAt, ...progressFields(d.status) } });
    await logActivity(userId, "career", `Application #${String(count + 1).padStart(3, "0")} — ${d.position} at ${d.company}`);
  }
  await syncAchievements(userId);
  refreshAll();
  return success();
}

export async function moveApplication(id: string, status: Status) {
  const userId = await requireUserId();
  if (!STATUSES.includes(status)) return;
  const current = await db.jobApplication.findFirst({ where: { id, userId } });
  if (!current || current.status === status) return;
  await db.jobApplication.update({
    where: { id },
    data: {
      status,
      appliedAt: current.appliedAt ?? (status !== "SAVED" ? dateOnly(localDateKey()) : null),
      ...progressFields(status, current),
    },
  });
  await afterStatus(userId, current.company, status);
  await syncAchievements(userId);
  refreshAll();
}

export async function deleteApplication(id: string) {
  const userId = await requireUserId();
  await db.jobApplication.deleteMany({ where: { id, userId } });
  refreshAll();
}

async function afterStatus(userId: string, company: string, status: Status) {
  const message =
    status === "CLOSED" ? `${company} — Closed. Next. 💪` : `${company} moved to ${labelOf(APPLICATION_STATUSES, status)}`;
  await logActivity(userId, "career", message);
}

// ─────────────── Skills ───────────────

const EvidenceSchema = z.object({
  skillId: z.string().min(1),
  title: z.string().min(3, "Describe what you did").max(200),
  points: z.coerce.number().refine((v) => [5, 10, 20].includes(v)),
  url: z.url().optional(),
  date: z.iso.date().optional(),
});

export async function addEvidence(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = EvidenceSchema.safeParse(formObject(formData));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;
  const skill = await db.skill.findFirst({ where: { id: d.skillId, userId } });
  if (!skill) return fail("Skill not found");

  await db.skillEvidence.create({
    data: { skillId: skill.id, title: d.title, points: d.points, url: d.url, date: d.date ? new Date(d.date) : undefined },
  });
  await logActivity(userId, "learning", `${skill.name} ↑ ${d.title}`);
  await syncAchievements(userId);
  refreshAll();
  return success();
}

export async function deleteEvidence(id: string) {
  const userId = await requireUserId();
  await db.skillEvidence.deleteMany({ where: { id, skill: { userId } } });
  refreshAll();
}

export async function addSkill(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return fail("Name is too short");
  const count = await db.skill.count({ where: { userId } });
  try {
    await db.skill.create({ data: { userId, name, position: count } });
  } catch {
    return fail("This skill already exists");
  }
  refreshAll();
  return success();
}

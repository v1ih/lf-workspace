"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { METRICS } from "@/lib/goals";
import { logActivity, syncAchievements } from "@/lib/metrics";
import { fail, formObject, success, zodFail, type ActionState } from "@/lib/action-state";
import { refreshAll, requireUserId } from "./_shared";

// ─────────────── Sprints ───────────────

const SprintSchema = z
  .object({
    name: z.string().min(3).max(120),
    goal: z.string().max(400).optional(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    status: z.enum(["PLANNED", "ACTIVE", "COMPLETED"]).default("PLANNED"),
  })
  .refine((v) => v.endDate >= v.startDate, { message: "End date must be after the start date", path: ["endDate"] });

export async function saveSprint(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const id = formData.get("id")?.toString();
  const parsed = SprintSchema.safeParse(formObject(formData));
  if (!parsed.success) return zodFail(parsed.error);
  const d = parsed.data;
  const data = { ...d, goal: d.goal ?? null, startDate: new Date(d.startDate), endDate: new Date(d.endDate) };

  // Only one active sprint at a time
  if (d.status === "ACTIVE") {
    await db.sprint.updateMany({ where: { userId, status: "ACTIVE", NOT: id ? { id } : undefined }, data: { status: "PLANNED" } });
  }

  if (id) {
    const current = await db.sprint.findFirst({ where: { id, userId } });
    if (!current) return fail("Sprint not found");
    await db.sprint.update({ where: { id }, data });
    if (current.status !== "COMPLETED" && d.status === "COMPLETED") {
      await logActivity(userId, "task", `🏁 ${d.name} completed`);
      await syncAchievements(userId);
    }
  } else {
    await db.sprint.create({ data: { ...data, userId } });
    await logActivity(userId, "task", `Sprint planned: ${d.name}`);
  }
  refreshAll();
  return success();
}

// ─────────────── Profile & goals ───────────────

const ProfileSchema = z.object({
  name: z.string().min(2).max(80),
  title: z.string().min(2).max(120),
  companyName: z.string().min(2).max(120),
  githubUsername: z
    .string()
    .regex(/^[a-zA-Z0-9-]{1,39}$/, "Invalid GitHub username")
    .optional(),
});

export async function saveProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = ProfileSchema.safeParse(formObject(formData));
  if (!parsed.success) return zodFail(parsed.error);
  await db.user.update({ where: { id: userId }, data: { ...parsed.data, githubUsername: parsed.data.githubUsername ?? null } });
  refreshAll();
  return success();
}

export async function saveGoals(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const period = String(formData.get("period") ?? "");
  if (!/^\d{4}-\d{2}$/.test(period)) return fail("Invalid month");

  for (const metric of METRICS) {
    const raw = formData.get(metric.key);
    const target = Number(raw);
    if (raw === null || raw === "" || !Number.isFinite(target) || target < 0) continue;
    await db.goal.upsert({
      where: { userId_period_metric: { userId, period, metric: metric.key } },
      create: { userId, period, metric: metric.key, target },
      update: { target },
    });
  }
  refreshAll();
  return success();
}

const PasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(10, "Use at least 10 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "Passwords don't match", path: ["confirm"] });

export async function changePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = PasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) return zodFail(parsed.error);

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await bcrypt.compare(parsed.data.current, user.passwordHash))) return fail("Current password is wrong");

  await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(parsed.data.next, 12) } });
  return success();
}

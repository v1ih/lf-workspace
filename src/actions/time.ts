"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { dateOnly, localDateKey, startOfLocalDay } from "@/lib/dates";
import { logActivity, syncAchievements } from "@/lib/metrics";
import { taskCode } from "@/lib/utils";
import { fail, formObject, success, zodFail, type ActionState } from "@/lib/action-state";
import { refreshAll, requireUserId } from "./_shared";

async function stopRunning(userId: string) {
  const running = await db.timeEntry.findFirst({ where: { userId, endedAt: null }, include: { task: true } });
  if (!running) return null;
  await db.timeEntry.update({ where: { id: running.id }, data: { endedAt: new Date() } });
  return running;
}

async function ensureWorkday(userId: string) {
  const date = dateOnly(localDateKey());
  const existing = await db.workday.findUnique({ where: { userId_date: { userId, date } } });
  if (existing) return existing;
  await logActivity(userId, "workday", "Workday started");
  return db.workday.create({ data: { userId, date } });
}

export async function startTimer(taskId: string | null) {
  const userId = await requireUserId();
  await stopRunning(userId);
  await ensureWorkday(userId);

  if (taskId) {
    const task = await db.task.findFirst({ where: { id: taskId, userId } });
    if (!task) return;
    await db.timeEntry.create({ data: { userId, taskId, projectId: task.projectId } });
    if (task.status === "TODO" || task.status === "BACKLOG") {
      await db.task.update({ where: { id: task.id }, data: { status: "IN_PROGRESS" } });
    }
    await logActivity(userId, "time", `Started ${taskCode(task.number)} · ${task.title}`);
  } else {
    await db.timeEntry.create({ data: { userId, description: "General work" } });
    await logActivity(userId, "time", "Started tracking time");
  }
  refreshAll();
}

export async function stopTimer() {
  const userId = await requireUserId();
  const stopped = await stopRunning(userId);
  if (stopped) {
    const label = stopped.task ? taskCode(stopped.task.number) : "timer";
    await logActivity(userId, "time", `Paused ${label}`);
    await syncAchievements(userId);
  }
  refreshAll();
}

const ManualEntrySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    taskId: z.string().optional(),
    projectId: z.string().optional(),
    description: z.string().max(200).optional(),
  })
  .refine((v) => v.end > v.start, { message: "End time must be after start time", path: ["end"] });

export async function addManualEntry(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = ManualEntrySchema.safeParse(formObject(formData));
  if (!parsed.success) return zodFail(parsed.error);
  const { date, start, end, taskId, description } = parsed.data;
  let { projectId } = parsed.data;

  if (taskId) {
    const task = await db.task.findFirst({ where: { id: taskId, userId } });
    if (!task) return fail("Task not found");
    projectId = projectId ?? task.projectId ?? undefined;
  }

  const [y, m, d] = date.split("-").map(Number);
  const dayStart = startOfLocalDay(y, m, d);
  const at = (hhmm: string) => {
    const [h, min] = hhmm.split(":").map(Number);
    return new Date(dayStart.getTime() + (h * 60 + min) * 60000);
  };

  await db.timeEntry.create({
    data: { userId, taskId, projectId, description, startedAt: at(start), endedAt: at(end) },
  });
  await syncAchievements(userId);
  refreshAll();
  return success();
}

export async function deleteTimeEntry(id: string) {
  const userId = await requireUserId();
  await db.timeEntry.deleteMany({ where: { id, userId } });
  refreshAll();
}

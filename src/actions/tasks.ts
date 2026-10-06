"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity, syncAchievements } from "@/lib/metrics";
import { categoryForType, labelOf, TASK_STATUSES } from "@/lib/labels";
import { taskCode } from "@/lib/utils";
import { fail, formObject, success, zodFail, type ActionState } from "@/lib/action-state";
import { refreshAll, requireUserId } from "./_shared";

const STATUS = ["BACKLOG", "TODO", "IN_PROGRESS", "CODE_REVIEW", "DONE"] as const;

const TaskSchema = z.object({
  title: z.string().min(3, "Title is too short").max(160),
  description: z.string().max(4000).optional(),
  status: z.enum(STATUS).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  type: z.enum(["FRONTEND", "BACKEND", "FULL_STACK", "TESTING", "DEVOPS", "DOCS", "BUSINESS", "CAREER"]).default("FULL_STACK"),
  // Empty = derived from the type (see categoryForType)
  category: z.enum(["DEVELOPMENT", "BUSINESS", "CAREER", "ADMINISTRATIVE"]).optional(),
  projectId: z.string().optional(),
  sprintId: z.string().optional(),
  estimate: z.coerce.number().min(0).max(200).optional(),
  dueDate: z.iso.date().optional(),
  prUrl: z.url("PR link must be a URL").optional(),
});

/** Make sure referenced project/sprint belong to the current user. */
async function assertOwnership(userId: string, projectId?: string, sprintId?: string) {
  if (projectId && !(await db.project.findFirst({ where: { id: projectId, userId } }))) return false;
  if (sprintId && !(await db.sprint.findFirst({ where: { id: sprintId, userId } }))) return false;
  return true;
}

export async function createTask(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const parsed = TaskSchema.safeParse(formObject(formData));
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;
  if (!(await assertOwnership(userId, data.projectId, data.sprintId))) return fail("Invalid project or sprint");

  // Number + insert in one transaction so two tabs can't take the same LF-number
  const task = await db.$transaction(async (tx) => {
    const last = await tx.task.findFirst({ where: { userId }, orderBy: { number: "desc" }, select: { number: true } });
    return tx.task.create({
      data: {
        ...data,
        category: data.category ?? categoryForType(data.type),
        userId,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        number: (last?.number ?? 0) + 1,
        completedAt: data.status === "DONE" ? new Date() : null,
      },
    });
  });

  await logActivity(userId, "task", `Created ${taskCode(task.number)} · ${task.title}`);
  refreshAll();
  return success();
}

export async function updateTask(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const current = await db.task.findFirst({ where: { id, userId } });
  if (!current) return fail("Task not found");

  const parsed = TaskSchema.safeParse(formObject(formData));
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;
  if (!(await assertOwnership(userId, data.projectId, data.sprintId))) return fail("Invalid project or sprint");

  await db.task.update({
    where: { id },
    data: {
      ...data,
      category: data.category ?? categoryForType(data.type),
      description: data.description ?? null,
      projectId: data.projectId ?? null,
      sprintId: data.sprintId ?? null,
      estimate: data.estimate ?? null,
      prUrl: data.prUrl ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      completedAt: completedAtFor(current.status, data.status, current.completedAt),
    },
  });

  if (current.status !== data.status) await afterStatusChange(userId, current.number, data.status);
  refreshAll();
  return success();
}

/** Called by the Kanban drag & drop. */
export async function moveTask(id: string, status: (typeof STATUS)[number], orderedIds: string[]) {
  const userId = await requireUserId();
  if (!STATUS.includes(status)) return;
  const task = await db.task.findFirst({ where: { id, userId } });
  if (!task) return;

  await db.$transaction([
    db.task.update({
      where: { id },
      data: { status, completedAt: completedAtFor(task.status, status, task.completedAt) },
    }),
    // Persist the order of the destination column
    ...orderedIds.map((taskId, position) =>
      db.task.updateMany({ where: { id: taskId, userId }, data: { position } }),
    ),
  ]);

  if (task.status !== status) await afterStatusChange(userId, task.number, status);
  refreshAll();
}

export async function submitForReview(_: ActionState, formData: FormData): Promise<ActionState> {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  const prUrl = String(formData.get("prUrl") ?? "").trim();
  if (prUrl && !z.url().safeParse(prUrl).success) return fail("PR link must be a URL");

  const task = await db.task.findFirst({ where: { id, userId } });
  if (!task) return fail("Task not found");

  await db.task.update({ where: { id }, data: { status: "CODE_REVIEW", prUrl: prUrl || task.prUrl } });
  // Submitting stops the clock on this task
  await db.timeEntry.updateMany({ where: { userId, taskId: id, endedAt: null }, data: { endedAt: new Date() } });
  await afterStatusChange(userId, task.number, "CODE_REVIEW");
  refreshAll();
  return success();
}

export async function deleteTask(id: string) {
  const userId = await requireUserId();
  const task = await db.task.findFirst({ where: { id, userId } });
  if (!task) return;
  await db.task.delete({ where: { id } });
  await logActivity(userId, "task", `Deleted ${taskCode(task.number)}`);
  refreshAll();
}

function completedAtFor(from: string, to: string, previous: Date | null) {
  if (to !== "DONE") return null;
  return from === "DONE" ? previous : new Date();
}

async function afterStatusChange(userId: string, number: number, status: string) {
  await logActivity(userId, "task", `${taskCode(number)} moved to ${labelOf(TASK_STATUSES, status)}`);
  if (status === "DONE") await syncAchievements(userId);
}

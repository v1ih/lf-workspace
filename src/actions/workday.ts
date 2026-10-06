"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { dateOnly, localDateKey } from "@/lib/dates";
import { logActivity, syncAchievements } from "@/lib/metrics";
import { refreshAll, requireUserId } from "./_shared";

export async function startWorkday() {
  const userId = await requireUserId();
  const date = dateOnly(localDateKey());
  const existing = await db.workday.findUnique({ where: { userId_date: { userId, date } } });

  if (!existing) {
    await db.workday.create({ data: { userId, date } });
    await logActivity(userId, "workday", "Workday started");
  } else if (existing.endedAt) {
    // Came back after closing the day: reopen it
    await db.workday.update({ where: { id: existing.id }, data: { endedAt: null } });
    await logActivity(userId, "workday", "Workday reopened");
  }
  refreshAll();
  redirect("/today");
}

export async function endWorkday(formData: FormData) {
  const userId = await requireUserId();
  const date = dateOnly(localDateKey());
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Closing the day also stops a running timer
  await db.timeEntry.updateMany({ where: { userId, endedAt: null }, data: { endedAt: new Date() } });
  await db.workday.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, endedAt: new Date(), notes },
    update: { endedAt: new Date(), notes },
  });
  await logActivity(userId, "workday", "Workday completed");
  await syncAchievements(userId, { checkCommits: true });
  refreshAll();
}

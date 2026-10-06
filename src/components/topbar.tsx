import Link from "next/link";
import { LogOut, Sun } from "lucide-react";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/dal";
import { dateOnly, localDateKey } from "@/lib/dates";
import { taskCode } from "@/lib/utils";
import { logout } from "@/actions/auth";
import { startWorkday } from "@/actions/workday";
import { RunningTimer } from "./running-timer";
import { buttonClass } from "./ui/button";

export async function Topbar({ user }: { user: CurrentUser }) {
  const [running, workday] = await Promise.all([
    db.timeEntry.findFirst({ where: { userId: user.id, endedAt: null }, include: { task: true } }),
    db.workday.findUnique({ where: { userId_date: { userId: user.id, date: dateOnly(localDateKey()) } } }),
  ]);

  const timer = running
    ? {
        startedAt: running.startedAt.toISOString(),
        label: running.task ? taskCode(running.task.number) : (running.description ?? "Working"),
      }
    : null;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="flex items-center justify-end gap-2 border-b border-line bg-canvas/80 px-4 py-3 backdrop-blur sm:px-8">
      <RunningTimer running={timer} />

      {!workday || workday.endedAt ? (
        <form action={startWorkday}>
          <button type="submit" className={buttonClass("dark", "sm")}>
            <Sun className="size-3.5" /> {workday?.endedAt ? "Reopen workday" : "Start workday"}
          </button>
        </form>
      ) : (
        <Link href="/today#end-of-day" className={buttonClass("secondary", "sm")}>
          End of day
        </Link>
      )}

      <div className="flex items-center gap-2 sm:ml-1 sm:border-l sm:border-line sm:pl-3">
        <span className="hidden size-8 place-items-center rounded-full sm:grid bg-accent-soft text-xs font-semibold text-accent-strong">
          {initials}
        </span>
        <div className="hidden leading-tight sm:block">
          <p className="text-xs font-semibold">{user.name}</p>
          <p className="text-[11px] text-muted">{user.title}</p>
        </div>
        <form action={logout}>
          <button type="submit" className={buttonClass("ghost", "icon")} aria-label="Sign out" title="Sign out">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

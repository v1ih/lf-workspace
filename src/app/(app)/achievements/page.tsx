import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { formatShortDate } from "@/lib/dates";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Achievements" };

export default async function AchievementsPage() {
  const user = await getCurrentUser();
  const unlocked = new Map(
    (await db.achievement.findMany({ where: { userId: user.id } })).map((a) => [a.key, a.unlockedAt]),
  );

  return (
    <>
      <PageHeader
        title="Achievements"
        subtitle={`${unlocked.size} of ${ACHIEVEMENTS.length} unlocked — automatically, from real data.`}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const at = unlocked.get(a.key);
          return (
            <div
              key={a.key}
              className={cn(
                "flex items-center gap-4 rounded-card border p-5",
                at ? "border-accent/30 bg-surface shadow-sm" : "border-dashed border-line bg-transparent",
              )}
            >
              <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-2xl", at ? "bg-accent-soft" : "bg-sunken grayscale")}>
                {at ? a.emoji : <Lock className="size-5 text-muted" />}
              </span>
              <div>
                <p className={cn("font-semibold", !at && "text-ink-soft")}>{a.title}</p>
                <p className="text-xs text-muted">{a.description}</p>
                {at && <p className="mt-1 text-[11px] font-medium text-accent">Unlocked {formatShortDate(at)}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

import { formatShortDate, formatTime, localDateKey } from "@/lib/dates";

type Item = { id: string; message: string; kind: string; createdAt: Date };

const DOT: Record<string, string> = {
  task: "bg-sky-500",
  time: "bg-accent",
  workday: "bg-amber-500",
  achievement: "bg-violet-500",
  career: "bg-emerald-500",
  business: "bg-rose-500",
  finance: "bg-emerald-600",
  learning: "bg-indigo-500",
};

/** "09:03 Started LF-014" — the history of your evolution. */
export function ActivityFeed({ items, empty = "No activity yet." }: { items: Item[]; empty?: string }) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  const today = localDateKey();

  return (
    <ol className="relative space-y-3 before:absolute before:inset-y-1 before:left-[3px] before:w-px before:bg-line">
      {items.map((item) => (
        <li key={item.id} className="relative flex gap-3 pl-4 text-sm">
          <span className={`absolute left-0 top-1.5 size-[7px] rounded-full ${DOT[item.kind] ?? "bg-muted"}`} />
          <span className="w-12 shrink-0 font-mono text-xs leading-5 text-muted">
            {localDateKey(item.createdAt) === today ? formatTime(item.createdAt) : formatShortDate(item.createdAt)}
          </span>
          <span className="leading-5 text-ink-soft">{item.message}</span>
        </li>
      ))}
    </ol>
  );
}

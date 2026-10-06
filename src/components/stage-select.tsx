"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";

type Props<T extends string> = {
  id: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onMove: (id: string, value: T) => Promise<void>;
  className?: string;
};

/** Compact select that moves a record to another pipeline stage. */
export function StageSelect<T extends string>({ id, value, options, onMove, className }: Props<T>) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Move to stage"
      value={value}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.target.value as T;
        startTransition(() => onMove(id, next));
      }}
      className={cn(
        "h-7 rounded-md border border-line bg-surface px-1.5 text-xs text-ink-soft focus:border-accent focus:outline-none disabled:opacity-50",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

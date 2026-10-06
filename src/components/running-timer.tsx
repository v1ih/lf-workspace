"use client";

import { useEffect, useState, useTransition } from "react";
import { Pause, Play } from "lucide-react";
import { startTimer, stopTimer } from "@/actions/time";
import { formatClock } from "@/lib/utils";
import { Button } from "./ui/button";

type Props = {
  running: { startedAt: string; label: string } | null;
};

/** Ticking timer in the top bar. The server only stores startedAt; the browser does the counting. */
export function RunningTimer({ running }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!running) {
    return (
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => startTransition(() => startTimer(null))}>
        <Play className="size-3.5" /> Start timer
      </Button>
    );
  }

  const seconds = (now - new Date(running.startedAt).getTime()) / 1000;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft py-1 pl-3 pr-1">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-accent" />
      </span>
      <span className="max-w-40 truncate text-xs font-medium text-accent-strong">{running.label}</span>
      <span className="font-mono text-sm tabular-nums text-ink" suppressHydrationWarning>
        {formatClock(seconds)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Pause timer"
        disabled={pending}
        onClick={() => startTransition(() => stopTimer())}
      >
        <Pause className="size-4" />
      </Button>
    </div>
  );
}

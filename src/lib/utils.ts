import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 1 → "LF-001" */
export function taskCode(number: number) {
  return `LF-${String(number).padStart(3, "0")}`;
}

export function formatMoney(value: number, currency: "BRL" | "USD" = "BRL") {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/** 13320 seconds → "3h42" ; 300 → "5m" */
export function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** 3725 → "01:02:05" (used by the running timer) */
export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const parts = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  return parts.map((n) => String(n).padStart(2, "0")).join(":");
}

export function percent(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

/** Duration of a time entry in seconds; running entries count until `now`. */
export function entrySeconds(entry: { startedAt: Date; endedAt: Date | null }, now = new Date()) {
  const end = entry.endedAt ?? now;
  return Math.max(0, (end.getTime() - entry.startedAt.getTime()) / 1000);
}

import { cn } from "@/lib/utils";

export function Progress({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-sunken", className)} role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full bg-accent transition-[width] duration-500", barClassName)} style={{ width: `${width}%` }} />
    </div>
  );
}

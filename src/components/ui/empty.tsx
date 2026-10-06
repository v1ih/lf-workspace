export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
      <p className="text-sm font-medium text-ink-soft">{title}</p>
      {children && <div className="mt-1 text-xs text-muted">{children}</div>}
    </div>
  );
}

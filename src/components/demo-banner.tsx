import { logout } from "@/actions/auth";

/** Shown on every page of a "Try demo" account. */
export function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-accent px-4 py-2 text-center text-xs text-white">
      <span>
        <strong className="font-semibold">Demo mode</strong> — everything here is fictional and private to you. Play freely: it&apos;s
        deleted after 24 hours.
      </span>
      <form action={logout}>
        <button type="submit" className="rounded-md bg-white/15 px-2 py-0.5 font-medium hover:bg-white/25">
          Exit demo
        </button>
      </form>
    </div>
  );
}

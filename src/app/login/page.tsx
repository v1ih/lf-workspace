import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { DemoButton } from "./demo-button";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { demo } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-ink lg:flex">
        <Logo />
        <div>
          <p className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Work, business and career
            <br />
            <span className="text-accent">in one workspace.</span>
          </p>
          <p className="mt-4 max-w-sm text-sm text-sidebar-ink/80">
            The aesthetics represent the life you want. The numbers represent what you actually did.
          </p>
        </div>
        <p className="text-xs text-sidebar-ink/60">Lavínia Ferraz | Soluções Digitais</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo dark />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in to start your workday.</p>
          <LoginForm />

          <div className="my-8 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="rounded-2xl border border-accent/25 bg-accent-soft/50 p-5">
            <p className="text-sm font-semibold">Just looking around?</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Open a private demo workspace filled with fictional clients, tickets and numbers. Drag tickets, start the timer,
              move leads in the CRM — nothing you do touches real data, and it&apos;s deleted after 24 hours.
            </p>
            <DemoButton />
            {demo === "busy" && (
              <p className="mt-2 text-xs text-red-700">Too many demos were opened in the last hour. Please try again soon.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Logo({ dark }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-accent text-sm font-bold text-white">LF</span>
      <span className={dark ? "font-semibold text-ink" : "font-semibold text-white"}>LF Workspace</span>
    </div>
  );
}

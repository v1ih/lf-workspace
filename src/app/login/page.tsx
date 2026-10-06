import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
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

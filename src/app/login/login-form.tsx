"use client";

import { useActionState } from "react";
import { login } from "@/actions/auth";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="mt-8 space-y-4">
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <Button type="submit" className="w-full justify-center" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

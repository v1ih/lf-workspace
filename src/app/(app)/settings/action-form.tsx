"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/form-dialog";

/** Inline form bound to a Server Action, with a success/error line. */
export function ActionForm({
  action,
  submitLabel,
  resetOnSuccess,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  resetOnSuccess?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      {children}
      <div className="flex items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        {state?.ok && <p className="text-xs text-emerald-700">Saved ✓</p>}
        {state?.error && <p className="text-xs text-red-700">{state.error}</p>}
      </div>
    </form>
  );
}

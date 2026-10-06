"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { X } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { Button, type ButtonProps } from "./button";

type Props = {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  triggerProps?: ButtonProps;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel?: string;
  children: React.ReactNode;
};

/** A button that opens a native <dialog> with a form bound to a Server Action. */
export function FormDialog({ title, description, trigger, triggerProps, action, submitLabel = "Save", children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) ref.current?.close();
  }, [state]);

  return (
    <>
      <Button {...triggerProps} onClick={() => ref.current?.showModal()}>
        {trigger}
      </Button>
      <dialog
        ref={ref}
        className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl"
      >
        <form action={formAction} className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              <h2 className="text-base font-semibold">{title}</h2>
              {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={() => ref.current?.close()}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="space-y-4 overflow-y-auto px-6 py-5">{children}</div>
          <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
            {state?.error && <p className="mr-auto text-xs text-red-700">{state.error}</p>}
            <Button variant="secondary" onClick={() => ref.current?.close()}>
              Cancel
            </Button>
            <SubmitButton>{submitLabel}</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? "Saving…" : children}
    </Button>
  );
}

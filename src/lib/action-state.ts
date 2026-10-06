import type { ZodError } from "zod";

// Shape returned by every Server Action used with useActionState
export type ActionState = { ok?: boolean; error?: string; at?: number } | undefined;

export function fail(error: string): ActionState {
  return { ok: false, error };
}

export function success(): ActionState {
  // `at` makes each success unique, so the dialog can react to repeated submits
  return { ok: true, at: Date.now() };
}

export function zodFail(error: ZodError): ActionState {
  const issue = error.issues[0];
  const field = issue?.path.join(".");
  return fail(field ? `${field}: ${issue.message}` : issue?.message ?? "Invalid data");
}

/** FormData → plain object, turning empty strings into undefined. */
export function formObject(formData: FormData) {
  const obj: Record<string, string | undefined> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$ACTION")) continue;
    obj[key] = value.trim() === "" ? undefined : value.trim();
  }
  return obj;
}

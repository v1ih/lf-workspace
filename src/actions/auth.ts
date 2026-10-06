"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { fail, type ActionState } from "@/lib/action-state";

const LoginSchema = z.object({
  email: z.email("Enter a valid email").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Enter your password"),
});

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Same message for "no user" and "wrong password" so emails can't be probed
  const valid = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !valid) return fail("Invalid email or password");

  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

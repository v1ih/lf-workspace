import "server-only";
import { cookies } from "next/headers";
import { encrypt, decrypt, MAX_AGE_DAYS, SESSION_COOKIE as COOKIE } from "./jwt";

export async function createSession(userId: string, opts: { hours?: number } = {}) {
  const hours = opts.hours ?? MAX_AGE_DAYS * 24;
  const expires = new Date(Date.now() + hours * 60 * 60 * 1000);
  const token = await encrypt({ userId, expiresAt: expires.toISOString() });
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires,
    path: "/",
  });
}

export async function readSession() {
  const store = await cookies();
  return decrypt(store.get(COOKIE)?.value);
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

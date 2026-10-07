import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "lf_session";
export const MAX_AGE_DAYS = 7;

export type SessionPayload = { userId: string; expiresAt: string };

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and have at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    // The token expires together with the cookie
    .setExpirationTime(new Date(payload.expiresAt))
    .sign(getKey());
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getKey(), { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}


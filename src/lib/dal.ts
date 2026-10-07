import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "./db";
import { readSession } from "./session";

// Data Access Layer: the single place that turns the session cookie into a user.
// `cache` dedupes the lookup within one request (layout + page + components).
export const getCurrentUser = cache(async () => {
  const session = await readSession();
  if (!session?.userId) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, title: true, companyName: true, githubUsername: true, isDemo: true },
  });
  if (!user) redirect("/auth/reset");

  return user;
});

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;

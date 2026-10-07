"use server";

import { redirect } from "next/navigation";
import { createDemoWorkspace, demoCapacityReached, removeExpiredDemos } from "@/lib/demo";
import { createSession } from "@/lib/session";

/** "Try demo": creates a private workspace with fictional data and signs the visitor in. */
export async function startDemo() {
  await removeExpiredDemos();
  if (await demoCapacityReached()) redirect("/login?demo=busy");

  const user = await createDemoWorkspace();
  await createSession(user.id, { hours: 24 });
  redirect("/");
}

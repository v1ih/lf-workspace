import "server-only";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";

/** Every Server Action re-checks the session — never trust the client. */
export async function requireUserId() {
  const user = await getCurrentUser();
  return user.id;
}

/** Everything is dynamic per user, so refresh the whole app after a mutation. */
export function refreshAll() {
  revalidatePath("/", "layout");
}

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";
import type { Role } from "@/generated/prisma/enums";

// Memoized per-request: safe to call from multiple components/actions
// without hitting the cookie/JWT decode more than once per render pass.
export const requireUser = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});

export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/");
  }
  return user;
}

// Returns null instead of redirecting — for layout/nav code that needs to
// render differently when logged out without forcing a redirect loop.
export const getOptionalUser = cache(async (): Promise<SessionPayload | null> => {
  return getSession();
});

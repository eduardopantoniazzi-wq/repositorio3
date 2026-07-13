import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

// The JWT only proves *who* was logged in when the cookie was issued — it
// can outlive the underlying User row (deactivated, deleted, or the
// database itself reset under it, e.g. a redeploy that didn't reuse the
// persisted volume). Every request re-checks the user still exists and is
// active, and returns fresh name/role/unit from the database rather than
// trusting the (possibly stale) token claims. Memoized per-request so this
// DB round trip happens at most once per render/action pass.
//
// Deliberately does not clear the cookie here: this runs during page
// renders too, where Next.js forbids writing cookies (only Server Actions
// and Route Handlers may). A stale cookie just keeps failing this check
// and redirecting to /login until the user logs in again (which
// overwrites it) or explicitly logs out (which clears it safely).
export const requireUser = cache(async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.active) {
    redirect("/login");
  }

  return { userId: user.id, name: user.name, role: user.role, unitId: user.unitId };
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
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.active) return null;

  return { userId: user.id, name: user.name, role: user.role, unitId: user.unitId };
});

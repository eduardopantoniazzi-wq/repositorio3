import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/session";

const ACTIVE_UNIT_COOKIE = "wms_unit";

// ESTOQUISTA / OPERADOR_ENVASE are pinned to their own unit. ADMIN can look
// at any unit and switches via a cookie, defaulting to the first active
// unit (Santa Maria in the pilot).
export async function resolveActiveUnitId(user: SessionPayload): Promise<string> {
  if (user.role !== "ADMIN") {
    if (!user.unitId) {
      throw new Error(`User ${user.userId} has role ${user.role} but no unit assigned`);
    }
    return user.unitId;
  }

  const cookieStore = await cookies();
  const requestedUnitId = cookieStore.get(ACTIVE_UNIT_COOKIE)?.value;

  if (requestedUnitId) {
    const exists = await prisma.unit.findUnique({ where: { id: requestedUnitId } });
    if (exists) return exists.id;
  }

  const fallback = await prisma.unit.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
  if (!fallback) {
    throw new Error("No active unit configured");
  }
  return fallback.id;
}

export async function listUnitsForSwitcher() {
  return prisma.unit.findMany({ orderBy: { createdAt: "asc" } });
}

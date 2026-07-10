"use server";

import { cookies } from "next/headers";

const ACTIVE_UNIT_COOKIE = "wms_unit";

export async function setActiveUnit(formData: FormData) {
  const unitId = formData.get("activeUnitId");
  if (typeof unitId !== "string" || !unitId) return;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_UNIT_COOKIE, unitId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

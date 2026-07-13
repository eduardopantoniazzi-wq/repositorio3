import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { descriptionSimilarity, SIMILARITY_WARNING_THRESHOLD } from "@/lib/similar-skus";

// Backs the "does a similar SKU already exist?" warning on the SKU creation
// form, so estoquistas don't create near-duplicate catalog entries
// (e.g. "Saco 25kg kraft" vs "Saco kraft 25 kg").
export async function GET(request: NextRequest) {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get("unitId");
  const q = (searchParams.get("q") ?? "").trim();
  const excludeId = searchParams.get("excludeId") ?? undefined;

  if (!unitId || !q) {
    return NextResponse.json({ matches: [] });
  }

  if (user.role !== "ADMIN" && user.unitId !== unitId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const candidates = await prisma.sku.findMany({
    where: { unitId, active: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true, internalCode: true, description: true, unitOfMeasure: true },
  });

  const matches = candidates
    .map((sku) => ({ ...sku, score: descriptionSimilarity(sku.description, q) }))
    .filter((sku) => sku.score >= SIMILARITY_WARNING_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return NextResponse.json({ matches });
}

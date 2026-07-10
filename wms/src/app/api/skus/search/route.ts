import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getBalancesByUnit } from "@/lib/balance";

// Powers the SKU autocomplete pickers used on Entrada/Saída/SKU-list screens.
// Deliberately returns a small, fast payload — this is called on every
// keystroke from the floor.
export async function GET(request: NextRequest) {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get("unitId");
  const q = (searchParams.get("q") ?? "").trim();

  if (!unitId) {
    return NextResponse.json({ error: "unitId is required" }, { status: 400 });
  }

  // Non-admin users may only search within their own unit.
  if (user.role !== "ADMIN" && user.unitId !== unitId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const skus = await prisma.sku.findMany({
    where: {
      unitId,
      active: true,
      ...(q
        ? {
            OR: [
              { internalCode: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ classification: "asc" }, { description: "asc" }],
    take: 20,
    select: { id: true, internalCode: true, description: true, unitOfMeasure: true },
  });

  const balances = await getBalancesByUnit(unitId);

  return NextResponse.json({
    skus: skus.map((sku) => ({
      ...sku,
      balance: balances.get(sku.id) ?? 0,
    })),
  });
}

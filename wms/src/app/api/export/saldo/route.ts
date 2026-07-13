import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getBalancesByUnit } from "@/lib/balance";
import { toCsv } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unitId = searchParams.get("unitId");
  if (!unitId) return NextResponse.json({ error: "unitId is required" }, { status: 400 });
  if (user.role !== "ADMIN" && user.unitId !== unitId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [unit, skus, balances] = await Promise.all([
    prisma.unit.findUniqueOrThrow({ where: { id: unitId } }),
    prisma.sku.findMany({
      where: { unitId, active: true },
      include: { primarySupplier: true },
      orderBy: [{ classification: "asc" }, { description: "asc" }],
    }),
    getBalancesByUnit(unitId),
  ]);

  const rows = skus.map((sku) => {
    const balance = balances.get(sku.id) ?? 0;
    const value = sku.unitCost ? balance * sku.unitCost : "";
    return [
      sku.internalCode,
      sku.description,
      sku.classification,
      balance,
      sku.unitOfMeasure,
      sku.unitCost ?? "",
      value,
      sku.primarySupplier?.name ?? "",
    ];
  });

  const csv = toCsv(
    ["Código", "Descrição", "Classe", "Saldo", "UM", "Custo unitário", "Valor imobilizado", "Fornecedor"],
    rows
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="saldo-${unit.code}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

// Exports the full movement ledger, either for a single SKU (from the SKU
// detail page) or for a whole unit (for cross-checking against the legacy
// spreadsheet during the transition period).
export async function GET(request: NextRequest) {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const skuId = searchParams.get("skuId");
  const unitId = searchParams.get("unitId");

  if (!skuId && !unitId) {
    return NextResponse.json({ error: "skuId or unitId is required" }, { status: 400 });
  }

  let filenameScope = "movimentacoes";

  if (skuId) {
    const sku = await prisma.sku.findUnique({ where: { id: skuId } });
    if (!sku) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (user.role !== "ADMIN" && user.unitId !== sku.unitId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    filenameScope = sku.internalCode;
  } else if (unitId) {
    if (user.role !== "ADMIN" && user.unitId !== unitId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    filenameScope = unit?.code ?? "unidade";
  }

  const movements = await prisma.movement.findMany({
    where: skuId ? { skuId } : { sku: { unitId: unitId! } },
    include: { sku: true, user: true, supplier: true },
    orderBy: { occurredAt: "desc" },
  });

  const rows = movements.map((m) => [
    m.occurredAt.toISOString(),
    m.type,
    m.sku.internalCode,
    m.sku.description,
    m.quantity,
    m.sku.unitOfMeasure,
    m.supplier?.name ?? "",
    m.invoiceNumber ?? "",
    m.destinationLine ?? "",
    m.productionOrder ?? "",
    m.user.name,
    m.notes ?? "",
  ]);

  const csv = toCsv(
    [
      "Data/hora",
      "Tipo",
      "Código SKU",
      "Descrição",
      "Quantidade",
      "UM",
      "Fornecedor",
      "NF",
      "Destino",
      "Ordem de produção",
      "Lançado por",
      "Observações",
    ],
    rows
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameScope}-movimentacoes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { resolveActiveUnitId } from "@/lib/units";
import { prisma } from "@/lib/prisma";
import { SkuBulkImportForm } from "@/components/sku-bulk-import-form";

export default async function ImportarSkusPage() {
  const user = await requireRole("ADMIN", "ESTOQUISTA");
  const unitId = await resolveActiveUnitId(user);
  const unit = await prisma.unit.findUniqueOrThrow({ where: { id: unitId } });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Importar embalagens em lote — {unit.name}</h1>
        <Link href="/skus" className="text-sm text-blue-600 hover:underline">
          Voltar
        </Link>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <SkuBulkImportForm unitId={unit.id} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { resolveActiveUnitId } from "@/lib/units";
import { prisma } from "@/lib/prisma";
import { SkuForm } from "@/components/sku-form";

export default async function NovoSkuPage() {
  const user = await requireRole("ADMIN", "ESTOQUISTA");
  const unitId = await resolveActiveUnitId(user);
  const [unit, suppliers] = await Promise.all([
    prisma.unit.findUniqueOrThrow({ where: { id: unitId } }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Novo SKU de embalagem</h1>
        <Link href="/skus" className="text-sm text-blue-600 hover:underline">
          Voltar
        </Link>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <SkuForm unitId={unit.id} unitLabel={unit.name} suppliers={suppliers} />
      </div>
    </div>
  );
}

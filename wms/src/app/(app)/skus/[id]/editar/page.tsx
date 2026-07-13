import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { SkuEditForm } from "@/components/sku-edit-form";

export default async function EditarSkuPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("ADMIN", "ESTOQUISTA");
  const { id } = await params;

  const [sku, suppliers] = await Promise.all([
    prisma.sku.findUnique({ where: { id }, include: { unit: true } }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!sku) notFound();
  if (user.role !== "ADMIN" && user.unitId !== sku.unitId) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Editar SKU</h1>
        <Link href={`/skus/${sku.id}`} className="text-sm text-blue-600 hover:underline">
          Voltar
        </Link>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <SkuEditForm sku={sku} unitLabel={sku.unit.name} suppliers={suppliers} />
      </div>
    </div>
  );
}

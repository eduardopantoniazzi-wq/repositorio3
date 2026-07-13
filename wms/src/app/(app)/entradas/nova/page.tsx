import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { resolveActiveUnitId } from "@/lib/units";
import { prisma } from "@/lib/prisma";
import { EntradaForm } from "@/components/entrada-form";

export default async function NovaEntradaPage() {
  const user = await requireRole("ADMIN", "ESTOQUISTA");
  const unitId = await resolveActiveUnitId(user);
  const suppliers = await prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Registrar entrada</h1>
        <Link href="/entradas" className="text-sm text-blue-600 hover:underline">
          Ver histórico
        </Link>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <EntradaForm unitId={unitId} suppliers={suppliers} />
      </div>
    </div>
  );
}

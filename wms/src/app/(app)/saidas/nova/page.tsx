import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { resolveActiveUnitId } from "@/lib/units";
import { SaidaForm } from "@/components/saida-form";

export default async function NovaSaidaPage() {
  const user = await requireRole("ADMIN", "ESTOQUISTA", "OPERADOR_ENVASE");
  const unitId = await resolveActiveUnitId(user);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Retirar embalagem para envase</h1>
        {user.role !== "OPERADOR_ENVASE" && (
          <Link href="/saidas" className="text-sm text-blue-600 hover:underline">
            Ver histórico
          </Link>
        )}
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <SaidaForm unitId={unitId} />
      </div>
    </div>
  );
}

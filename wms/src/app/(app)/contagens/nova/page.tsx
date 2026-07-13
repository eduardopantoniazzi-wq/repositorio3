import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { resolveActiveUnitId } from "@/lib/units";
import { CycleCountForm } from "@/components/cycle-count-form";

export default async function NovaContagemPage() {
  const user = await requireRole("ADMIN", "ESTOQUISTA");
  const unitId = await resolveActiveUnitId(user);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Registrar contagem cíclica</h1>
        <Link href="/contagens" className="text-sm text-blue-600 hover:underline">
          Ver contagens
        </Link>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <CycleCountForm unitId={unitId} />
      </div>
    </div>
  );
}

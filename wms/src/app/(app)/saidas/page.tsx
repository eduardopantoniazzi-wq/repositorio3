import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { resolveActiveUnitId } from "@/lib/units";
import { listRecentMovements } from "@/lib/actions/movements";

export default async function SaidasPage() {
  const user = await requireRole("ADMIN", "ESTOQUISTA");
  const unitId = await resolveActiveUnitId(user);
  const movements = await listRecentMovements("SAIDA", unitId);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Saídas recentes</h1>
        <Link
          href="/saidas/nova"
          className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700"
        >
          + Nova saída
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Data/hora</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Quantidade</th>
              <th className="px-4 py-3">Destino</th>
              <th className="px-4 py-3">OP</th>
              <th className="px-4 py-3">Operador</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                    m.occurredAt
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/skus/${m.skuId}`} className="text-blue-600 hover:underline">
                    <span className="font-mono text-xs text-slate-500">{m.sku.internalCode}</span>{" "}
                    {m.sku.description}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  -{m.quantity.toLocaleString("pt-BR")} {m.sku.unitOfMeasure}
                </td>
                <td className="px-4 py-3">{m.destinationLine ?? "—"}</td>
                <td className="px-4 py-3">{m.productionOrder ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{m.user.name}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Nenhuma saída registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

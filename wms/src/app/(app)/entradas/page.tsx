import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { resolveActiveUnitId } from "@/lib/units";
import { listRecentMovements } from "@/lib/actions/movements";

export default async function EntradasPage() {
  const user = await requireRole("ADMIN", "ESTOQUISTA");
  const unitId = await resolveActiveUnitId(user);
  const movements = await listRecentMovements("ENTRADA", unitId);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Entradas recentes</h1>
        <Link
          href="/entradas/nova"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nova entrada
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Quantidade</th>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">NF</th>
              <th className="px-4 py-3">Lançado por</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(m.occurredAt)}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/skus/${m.skuId}`} className="text-blue-600 hover:underline">
                    <span className="font-mono text-xs text-slate-500">{m.sku.internalCode}</span>{" "}
                    {m.sku.description}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  +{m.quantity.toLocaleString("pt-BR")} {m.sku.unitOfMeasure}
                </td>
                <td className="px-4 py-3">{m.supplier?.name ?? "—"}</td>
                <td className="px-4 py-3">{m.invoiceNumber ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{m.user.name}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Nenhuma entrada registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

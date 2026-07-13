import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { resolveActiveUnitId } from "@/lib/units";
import { prisma } from "@/lib/prisma";
import { getBalancesByUnit } from "@/lib/balance";

export default async function SaldoPage() {
  const user = await requireRole("ADMIN", "ESTOQUISTA");
  const unitId = await resolveActiveUnitId(user);

  const [skus, balances] = await Promise.all([
    prisma.sku.findMany({
      where: { unitId, active: true },
      include: { primarySupplier: true },
      orderBy: [{ classification: "asc" }, { description: "asc" }],
    }),
    getBalancesByUnit(unitId),
  ]);

  const rows = skus.map((sku) => {
    const balance = balances.get(sku.id) ?? 0;
    return { sku, balance, value: sku.unitCost ? balance * sku.unitCost : null };
  });

  const totalValue = rows.reduce((sum, r) => sum + (r.value ?? 0), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Saldo em tempo real</h1>
        <a
          href={`/api/export/saldo?unitId=${unitId}`}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Exportar CSV
        </a>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <InfoCard label="SKUs ativos" value={String(skus.length)} />
        <InfoCard
          label="Valor total imobilizado"
          value={totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        />
        <InfoCard
          label="SKUs sem custo cadastrado"
          value={String(rows.filter((r) => r.value === null).length)}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Classe</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3">UM</th>
              <th className="px-4 py-3 text-right">Valor imobilizado</th>
              <th className="px-4 py-3">Fornecedor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ sku, balance, value }) => (
              <tr key={sku.id} className={`hover:bg-slate-50 ${balance < 0 ? "bg-red-50" : ""}`}>
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/skus/${sku.id}`} className="text-blue-600 hover:underline">
                    {sku.internalCode}
                  </Link>
                </td>
                <td className="px-4 py-3">{sku.description}</td>
                <td className="px-4 py-3">{sku.classification}</td>
                <td className={`px-4 py-3 text-right font-medium ${balance < 0 ? "text-red-700" : ""}`}>
                  {balance.toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3">{sku.unitOfMeasure}</td>
                <td className="px-4 py-3 text-right">
                  {value !== null ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                </td>
                <td className="px-4 py-3">{sku.primarySupplier?.name ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Nenhum SKU cadastrado nesta unidade.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

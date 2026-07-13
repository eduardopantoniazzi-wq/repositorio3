import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { resolveActiveUnitId } from "@/lib/units";
import { prisma } from "@/lib/prisma";
import { getUnitDashboard } from "@/lib/dashboard";

export default async function DashboardPage() {
  const user = await requireRole("ADMIN");
  const unitId = await resolveActiveUnitId(user);

  const [unit, allActiveUnits] = await Promise.all([
    prisma.unit.findUniqueOrThrow({ where: { id: unitId } }),
    prisma.unit.findMany({ where: { active: true } }),
  ]);

  const unitDashboard = await getUnitDashboard(unitId);
  const allDashboards = await Promise.all(allActiveUnits.map((u) => getUnitDashboard(u.id)));

  const overall = {
    totalValue: allDashboards.reduce((s, d) => s + d.totalValue, 0),
    skuCount: allDashboards.reduce((s, d) => s + d.skuCount, 0),
    pendingCounts: allDashboards.reduce((s, d) => s + d.pendingCounts.length, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Dashboard gerencial</h1>
        <p className="text-sm text-slate-500">Visão geral (todas as unidades ativas) e detalhe de {unit.name}.</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Geral — todas as unidades</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <KpiCard label="Unidades ativas" value={String(allActiveUnits.length)} />
          <KpiCard label="SKUs ativos" value={String(overall.skuCount)} />
          <KpiCard
            label="Valor total imobilizado"
            value={overall.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          />
          <KpiCard
            label="Divergências pendentes de revisão"
            value={String(overall.pendingCounts)}
            alert={overall.pendingCounts > 0}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">{unit.name}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="SKUs ativos" value={String(unitDashboard.skuCount)} />
          <KpiCard
            label="Valor imobilizado"
            value={unitDashboard.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          />
          <KpiCard label="Giro anualizado (aprox.)" value={`${unitDashboard.turnoverPerYear.toFixed(1)}x/ano`} />
          <KpiCard
            label="Divergências pendentes"
            value={String(unitDashboard.pendingCounts.length)}
            alert={unitDashboard.pendingCounts.length > 0}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">
          Candidatos a excesso de estoque — {unit.name}
        </h2>
        <p className="mb-2 text-xs text-slate-500">
          SKUs com maior tempo de cobertura (saldo ÷ consumo médio dos últimos 30 dias). &ldquo;Sem consumo&rdquo;
          indica capital parado — investigar.
        </p>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3 text-right">Consumo/dia (30d)</th>
                <th className="px-4 py-3 text-right">Cobertura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {unitDashboard.excessCandidates.map((row) => (
                <tr key={row.skuId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/skus/${row.skuId}`} className="text-blue-600 hover:underline">
                      <span className="font-mono text-xs text-slate-500">{row.internalCode}</span>{" "}
                      {row.description}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.balance.toLocaleString("pt-BR")} {row.unitOfMeasure}
                  </td>
                  <td className="px-4 py-3 text-right">{row.consumptionPerDay.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {row.daysOfCoverage === null ? (
                      <span className="text-red-700">sem consumo (30d)</span>
                    ) : (
                      `${Math.round(row.daysOfCoverage)} dias`
                    )}
                  </td>
                </tr>
              ))}
              {unitDashboard.excessCandidates.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Sem dados suficientes ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">
          Divergências de contagem pendentes de revisão — {unit.name}
        </h2>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Divergência</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {unitDashboard.pendingCounts.map((c) => (
                <tr key={c.id} className="bg-red-50/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(c.countedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-500">{c.sku.internalCode}</span>{" "}
                    {c.sku.description}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-700">
                    {c.divergenceQty > 0 ? "+" : ""}
                    {c.divergenceQty.toLocaleString("pt-BR")} ({c.divergencePercent.toFixed(1)}%)
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/contagens/${c.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                      Revisar
                    </Link>
                  </td>
                </tr>
              ))}
              {unitDashboard.pendingCounts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma divergência pendente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl bg-white p-3 shadow-sm ${alert ? "ring-1 ring-red-300" : ""}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${alert ? "text-red-700" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

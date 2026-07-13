import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { resolveActiveUnitId } from "@/lib/units";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: "Pendente de revisão",
  REVIEWED_OK: "OK",
  REVIEWED_ADJUSTED: "Ajustado",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING_REVIEW: "bg-red-100 text-red-700",
  REVIEWED_OK: "bg-emerald-100 text-emerald-700",
  REVIEWED_ADJUSTED: "bg-blue-100 text-blue-700",
};

export default async function ContagensPage() {
  const user = await requireRole("ADMIN", "ESTOQUISTA");
  const unitId = await resolveActiveUnitId(user);

  const [counts, setting] = await Promise.all([
    prisma.cycleCount.findMany({
      where: { sku: { unitId } },
      include: { sku: true, countedBy: true },
      orderBy: { countedAt: "desc" },
      take: 100,
    }),
    prisma.setting.findUnique({ where: { id: 1 } }),
  ]);

  const threshold = setting?.divergenceThresholdPercent ?? 5;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Contagem cíclica</h1>
          <p className="text-xs text-slate-500">Limite de divergência configurado: {threshold}%</p>
        </div>
        <Link
          href="/contagens/nova"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nova contagem
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Sistema</th>
              <th className="px-4 py-3 text-right">Contado</th>
              <th className="px-4 py-3 text-right">Divergência</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Contado por</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {counts.map((c) => (
              <tr key={c.id} className={c.status === "PENDING_REVIEW" ? "bg-red-50/50" : "hover:bg-slate-50"}>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(c.countedAt)}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/skus/${c.skuId}`} className="text-blue-600 hover:underline">
                    <span className="font-mono text-xs text-slate-500">{c.sku.internalCode}</span>{" "}
                    {c.sku.description}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">{c.systemQuantityAtCount.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3 text-right">{c.countedQuantity.toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {c.divergenceQty > 0 ? "+" : ""}
                  {c.divergenceQty.toLocaleString("pt-BR")} ({c.divergencePercent.toFixed(1)}%)
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{c.countedBy.name}</td>
                <td className="px-4 py-3">
                  {c.status === "PENDING_REVIEW" && user.role === "ADMIN" && (
                    <Link href={`/contagens/${c.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                      Revisar
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {counts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  Nenhuma contagem registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

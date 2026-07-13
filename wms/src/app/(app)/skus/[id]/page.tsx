import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getBalanceForSku } from "@/lib/balance";
import { RemoveSkuButton } from "@/components/remove-sku-button";

const MOVEMENT_TYPE_LABEL: Record<string, string> = { ENTRADA: "Entrada", SAIDA: "Saída" };

export default async function SkuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const sku = await prisma.sku.findUnique({
    where: { id },
    include: { unit: true, primarySupplier: true },
  });
  if (!sku) notFound();
  if (user.role !== "ADMIN" && user.unitId !== sku.unitId) notFound();

  const [balance, movements] = await Promise.all([
    getBalanceForSku(sku.id),
    prisma.movement.findMany({
      where: { skuId: sku.id },
      include: { user: true, supplier: true },
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-slate-500">{sku.internalCode}</p>
          <h1 className="text-lg font-semibold text-slate-900">{sku.description}</h1>
        </div>
        <div className="flex items-center gap-4">
          {(user.role === "ADMIN" || user.role === "ESTOQUISTA") && (
            <>
              <Link href={`/skus/${sku.id}/editar`} className="text-sm font-medium text-blue-600 hover:underline">
                Editar
              </Link>
              {sku.active && <RemoveSkuButton skuId={sku.id} description={sku.description} />}
            </>
          )}
          <Link href="/skus" className="text-sm text-blue-600 hover:underline">
            Voltar
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <InfoCard label="Saldo atual" value={`${balance.toLocaleString("pt-BR")} ${sku.unitOfMeasure}`} highlight />
        <InfoCard label="Unidade" value={sku.unit.name} />
        <InfoCard label="Classificação" value={sku.classification} />
        <InfoCard label="Fornecedor" value={sku.primarySupplier?.name ?? "—"} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Histórico de movimentação</h2>
        <a
          href={`/api/export/movements?skuId=${sku.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Exportar CSV
        </a>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Data/hora</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Quantidade</th>
              <th className="px-4 py-3">Detalhe</th>
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
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.type === "ENTRADA" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {MOVEMENT_TYPE_LABEL[m.type]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {m.type === "ENTRADA" ? "+" : "-"}
                  {m.quantity.toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {m.type === "ENTRADA"
                    ? [m.supplier?.name, m.invoiceNumber && `NF ${m.invoiceNumber}`].filter(Boolean).join(" · ")
                    : [m.destinationLine, m.productionOrder && `OP ${m.productionOrder}`].filter(Boolean).join(" · ")}
                </td>
                <td className="px-4 py-3 text-slate-600">{m.user.name}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Nenhuma movimentação registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfoCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${highlight ? "text-blue-700" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

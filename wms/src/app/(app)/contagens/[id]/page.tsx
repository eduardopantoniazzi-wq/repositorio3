import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { reviewCycleCount } from "@/lib/actions/cycle-counts";

export default async function RevisarContagemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await params;

  const count = await prisma.cycleCount.findUnique({
    where: { id },
    include: { sku: true, countedBy: true },
  });
  if (!count) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Revisar divergência</h1>
        <Link href="/contagens" className="text-sm text-blue-600 hover:underline">
          Voltar
        </Link>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs font-mono text-slate-500">{count.sku.internalCode}</p>
        <p className="text-base font-semibold text-slate-900">{count.sku.description}</p>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Saldo no sistema</dt>
            <dd className="font-medium">{count.systemQuantityAtCount.toLocaleString("pt-BR")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Contado fisicamente</dt>
            <dd className="font-medium">{count.countedQuantity.toLocaleString("pt-BR")}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Divergência</dt>
            <dd className="font-medium text-red-700">
              {count.divergenceQty > 0 ? "+" : ""}
              {count.divergenceQty.toLocaleString("pt-BR")} ({count.divergencePercent.toFixed(1)}%)
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Contado por</dt>
            <dd className="font-medium">{count.countedBy.name}</dd>
          </div>
        </dl>
      </div>

      <form action={reviewCycleCount} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <input type="hidden" name="cycleCountId" value={count.id} />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Observações da revisão (opcional)
          </label>
          <textarea
            name="reviewNotes"
            rows={3}
            placeholder="Ex: contagem confirmada em nova conferência, motivo identificado..."
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="submit"
            name="decision"
            value="ok"
            className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Marcar como revisada (manter saldo do sistema)
          </button>
          <button
            type="submit"
            name="decision"
            value="adjust"
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Ajustar saldo do sistema para o valor contado
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Ajustar cria uma movimentação de correção auditável — o saldo nunca é sobrescrito diretamente.
        </p>
      </form>
    </div>
  );
}

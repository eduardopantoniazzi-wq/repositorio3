import Link from "next/link";
import { requireRole } from "@/lib/dal";
import { resolveActiveUnitId } from "@/lib/units";
import { prisma } from "@/lib/prisma";
import { getBalancesByUnit } from "@/lib/balance";
import { reactivateSku } from "@/lib/actions/skus";
import { RemoveSkuButton } from "@/components/remove-sku-button";

export default async function SkusPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireRole("ADMIN", "ESTOQUISTA");
  const unitId = await resolveActiveUnitId(user);
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [skus, balances] = await Promise.all([
    prisma.sku.findMany({
      where: {
        unitId,
        ...(query
          ? { OR: [{ internalCode: { contains: query } }, { description: { contains: query } }] }
          : {}),
      },
      include: { primarySupplier: true },
      orderBy: [{ classification: "asc" }, { description: "asc" }],
    }),
    getBalancesByUnit(unitId),
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">SKUs de embalagem</h1>
        <div className="flex gap-2">
          <Link
            href="/skus/importar"
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Importar lista
          </Link>
          <Link
            href="/skus/novo"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Novo SKU
          </Link>
        </div>
      </div>

      <form className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Buscar por código ou descrição..."
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </form>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Classe</th>
              <th className="px-4 py-3">UM</th>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3 text-right">Saldo atual</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {skus.map((sku) => (
              <tr key={sku.id} className={`hover:bg-slate-50 ${!sku.active ? "opacity-60" : ""}`}>
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/skus/${sku.id}`} className="text-blue-600 hover:underline">
                    {sku.internalCode}
                  </Link>
                </td>
                <td className="px-4 py-3">{sku.description}</td>
                <td className="px-4 py-3">{sku.classification}</td>
                <td className="px-4 py-3">{sku.unitOfMeasure}</td>
                <td className="px-4 py-3">{sku.primarySupplier?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {(balances.get(sku.id) ?? 0).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      sku.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {sku.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/skus/${sku.id}/editar`} className="text-sm font-medium text-blue-600 hover:underline">
                      Editar
                    </Link>
                    {sku.active ? (
                      <RemoveSkuButton skuId={sku.id} description={sku.description} />
                    ) : (
                      <form action={reactivateSku}>
                        <input type="hidden" name="skuId" value={sku.id} />
                        <button type="submit" className="text-sm font-medium text-blue-600 hover:underline">
                          Reativar
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {skus.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  Nenhum SKU encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

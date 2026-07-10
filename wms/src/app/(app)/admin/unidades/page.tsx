import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { UnitForm } from "@/components/unit-form";
import { toggleUnitActive } from "@/lib/actions/admin";

export default async function UnidadesPage() {
  await requireRole("ADMIN");
  const units = await prisma.unit.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { skus: true, users: true } } },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-4 text-lg font-semibold text-slate-900">Unidades</h1>
        <p className="mb-4 text-sm text-slate-500">
          Ativar uma unidade libera imediatamente o cadastro de SKUs e lançamentos para ela — nenhuma
          alteração de banco de dados é necessária para expandir o piloto.
        </p>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Sigla</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3 text-right">SKUs</th>
                <th className="px-4 py-3 text-right">Usuários</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{u.code}</td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-right">{u._count.skus}</td>
                  <td className="px-4 py-3 text-right">{u._count.users}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {u.active ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggleUnitActive}>
                      <input type="hidden" name="unitId" value={u.id} />
                      <button type="submit" className="text-sm font-medium text-blue-600 hover:underline">
                        {u.active ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Nova unidade</h2>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <UnitForm />
        </div>
      </div>
    </div>
  );
}

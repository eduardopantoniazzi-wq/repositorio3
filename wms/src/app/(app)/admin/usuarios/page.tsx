import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { UserForm } from "@/components/user-form";
import { toggleUserActive } from "@/lib/actions/admin";
import { ROLE_LABELS } from "@/lib/roles";

export default async function UsuariosPage() {
  const currentUser = await requireRole("ADMIN");

  const [users, units] = await Promise.all([
    prisma.user.findMany({ include: { unit: true }, orderBy: { createdAt: "asc" } }),
    prisma.unit.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-4 text-lg font-semibold text-slate-900">Usuários</h1>
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Unidade</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-3">{u.unit?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {u.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.id === currentUser.userId ? (
                      <span className="text-sm text-slate-400">Você</span>
                    ) : (
                      <form action={toggleUserActive}>
                        <input type="hidden" name="userId" value={u.id} />
                        <button type="submit" className="text-sm font-medium text-blue-600 hover:underline">
                          {u.active ? "Desativar" : "Reativar"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Novo usuário</h2>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <UserForm units={units} />
        </div>
      </div>
    </div>
  );
}

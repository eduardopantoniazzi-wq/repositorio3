"use client";

import { useActionState, useState } from "react";
import { createUser, type CreateUserState } from "@/lib/actions/admin";
import { ROLE_LABELS } from "@/lib/roles";

type Unit = { id: string; name: string };

export function UserForm({ units }: { units: Unit[] }) {
  const [state, formAction, pending] = useActionState<CreateUserState, FormData>(createUser, undefined);
  const [formKey, setFormKey] = useState(0);
  const [role, setRole] = useState<"ADMIN" | "ESTOQUISTA" | "OPERADOR_ENVASE">("ESTOQUISTA");

  return (
    <div>
      {state?.success && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>Usuário criado com sucesso.</span>
          <button type="button" onClick={() => setFormKey((k) => k + 1)} className="font-medium underline">
            Criar outro
          </button>
        </div>
      )}
      <form key={formKey} action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
          <input
            name="name"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">E-mail</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Senha inicial</label>
          <input
            name="password"
            type="text"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Perfil</label>
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {role !== "ADMIN" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Unidade</label>
              <select
                name="unitId"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Selecione...</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Criar usuário"}
        </button>
      </form>
    </div>
  );
}

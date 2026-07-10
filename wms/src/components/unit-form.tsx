"use client";

import { useActionState, useState } from "react";
import { createUnit, type CreateUnitState } from "@/lib/actions/admin";

export function UnitForm() {
  const [state, formAction, pending] = useActionState<CreateUnitState, FormData>(createUnit, undefined);
  const [formKey, setFormKey] = useState(0);

  return (
    <div>
      {state?.success && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>Unidade criada com sucesso.</span>
          <button type="button" onClick={() => setFormKey((k) => k + 1)} className="font-medium underline">
            Criar outra
          </button>
        </div>
      )}
      <form key={formKey} action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Sigla</label>
          <input
            name="code"
            required
            placeholder="Ex: CS"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base uppercase focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
          <input
            name="name"
            required
            placeholder="Ex: Canoas/RS"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Criar unidade"}
        </button>
      </form>
    </div>
  );
}

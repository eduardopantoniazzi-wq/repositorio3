"use client";

import { useActionState, useState } from "react";
import { SkuPicker } from "@/components/sku-picker";
import { registerSaida, type SaidaFormState } from "@/lib/actions/movements";

// The most-used, must-not-skip screen in the app: minimal fields, big
// touch targets, auto-resets after each submit so an operator can log a
// whole shift's withdrawals back-to-back in a few seconds each.

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function SaidaForm({ unitId }: { unitId: string }) {
  const [state, formAction, pending] = useActionState<SaidaFormState, FormData>(
    registerSaida,
    undefined
  );
  const [formKey, setFormKey] = useState(0);

  return (
    <div>
      {state?.success && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>Saída registrada com sucesso.</span>
          <button
            type="button"
            onClick={() => setFormKey((k) => k + 1)}
            className="font-medium underline"
          >
            Registrar outra
          </button>
        </div>
      )}
      <form key={formKey} action={formAction} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">SKU retirado</label>
          <SkuPicker unitId={unitId} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Quantidade</label>
          <input
            name="quantity"
            type="number"
            step="0.01"
            min="0.01"
            required
            autoFocus={false}
            inputMode="decimal"
            className="w-full rounded-lg border border-slate-300 px-4 py-4 text-xl font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Data</label>
          <input
            name="occurredDate"
            type="date"
            required
            defaultValue={todayIso()}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Ordem de produção <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input
            name="productionOrder"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-orange-600 px-4 py-4 text-lg font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Registrar saída"}
        </button>
      </form>
    </div>
  );
}

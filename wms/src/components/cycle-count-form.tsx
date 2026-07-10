"use client";

import { useActionState, useState } from "react";
import { SkuPicker } from "@/components/sku-picker";
import { registerCycleCount, type CycleCountFormState } from "@/lib/actions/cycle-counts";

type SkuOption = { id: string; internalCode: string; description: string; unitOfMeasure: string; balance: number };

export function CycleCountForm({ unitId }: { unitId: string }) {
  const [state, formAction, pending] = useActionState<CycleCountFormState, FormData>(
    registerCycleCount,
    undefined
  );
  const [formKey, setFormKey] = useState(0);
  const [selected, setSelected] = useState<SkuOption | null>(null);

  return (
    <div>
      {state?.success && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>Contagem registrada com sucesso.</span>
          <button
            type="button"
            onClick={() => {
              setFormKey((k) => k + 1);
              setSelected(null);
            }}
            className="font-medium underline"
          >
            Registrar outra
          </button>
        </div>
      )}
      <form key={formKey} action={formAction} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">SKU</label>
          <SkuPicker unitId={unitId} onSelect={setSelected} />
        </div>

        {selected && (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
            Saldo atual no sistema: <strong>{selected.balance.toLocaleString("pt-BR")} {selected.unitOfMeasure}</strong>
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Quantidade contada fisicamente</label>
          <input
            name="countedQuantity"
            type="number"
            step="0.01"
            min="0"
            required
            inputMode="decimal"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Registrar contagem"}
        </button>
      </form>
    </div>
  );
}

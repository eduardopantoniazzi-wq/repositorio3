"use client";

import { useActionState, useState } from "react";
import { SkuPicker } from "@/components/sku-picker";
import { registerEntrada, type EntradaFormState } from "@/lib/actions/movements";

type Supplier = { id: string; name: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function EntradaForm({ unitId, suppliers }: { unitId: string; suppliers: Supplier[] }) {
  const [state, formAction, pending] = useActionState<EntradaFormState, FormData>(
    registerEntrada,
    undefined
  );
  const [formKey, setFormKey] = useState(0);
  const [supplierMode, setSupplierMode] = useState<"existing" | "new">(
    suppliers.length > 0 ? "existing" : "new"
  );

  return (
    <div>
      {state?.success && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>Entrada registrada com sucesso.</span>
          <button
            type="button"
            onClick={() => setFormKey((k) => k + 1)}
            className="font-medium underline"
          >
            Lançar outra
          </button>
        </div>
      )}
      <form key={formKey} action={formAction} className="space-y-5">
        <input type="hidden" name="unitId" value={unitId} />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">SKU</label>
          <SkuPicker unitId={unitId} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Quantidade recebida</label>
          <input
            name="quantity"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Fornecedor</label>
          <div className="space-y-2">
            {suppliers.length > 0 && (
              <div className="flex gap-4 text-sm text-slate-600">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={supplierMode === "existing"}
                    onChange={() => setSupplierMode("existing")}
                  />
                  Selecionar existente
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={supplierMode === "new"}
                    onChange={() => setSupplierMode("new")}
                  />
                  Novo fornecedor
                </label>
              </div>
            )}
            {supplierMode === "existing" && suppliers.length > 0 ? (
              <select
                name="supplierId"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Selecione...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="newSupplierName"
                required
                placeholder="Nome do fornecedor"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nº da nota fiscal</label>
            <input
              name="invoiceNumber"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Data de recebimento</label>
            <input
              name="receivedDate"
              type="date"
              required
              defaultValue={todayIso()}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Observações (opcional)</label>
          <input
            name="notes"
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
          {pending ? "Salvando..." : "Registrar entrada"}
        </button>
      </form>
    </div>
  );
}

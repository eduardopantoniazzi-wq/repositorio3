"use client";

import { useActionState, useState } from "react";
import { updateSku, type SkuFormState } from "@/lib/actions/skus";

type Supplier = { id: string; name: string };
type SkuInitial = {
  id: string;
  internalCode: string;
  description: string;
  unitOfMeasure: string;
  classification: "A" | "B" | "C";
  unitCost: number | null;
  defaultLeadTimeDays: number | null;
  primarySupplierId: string | null;
};

export function SkuEditForm({
  sku,
  unitLabel,
  suppliers,
}: {
  sku: SkuInitial;
  unitLabel: string;
  suppliers: Supplier[];
}) {
  const [state, formAction, pending] = useActionState<SkuFormState, FormData>(updateSku, undefined);
  const [supplierMode, setSupplierMode] = useState<"existing" | "new">("existing");

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="skuId" value={sku.id} />

      <Field label="Unidade">
        <input
          disabled
          value={unitLabel}
          className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-500"
        />
      </Field>

      <Field label="Código interno" error={state?.fieldErrors?.internalCode?.[0]}>
        <input
          name="internalCode"
          required
          defaultValue={sku.internalCode}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </Field>

      <Field label="Descrição" error={state?.fieldErrors?.description?.[0]}>
        <input
          name="description"
          required
          defaultValue={sku.description}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Unidade de medida" error={state?.fieldErrors?.unitOfMeasure?.[0]}>
          <input
            name="unitOfMeasure"
            required
            defaultValue={sku.unitOfMeasure}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </Field>

        <Field label="Classificação">
          <select
            name="classification"
            defaultValue={sku.classification}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="A">A (alto giro/valor)</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Custo unitário (R$)">
          <input
            name="unitCost"
            type="number"
            step="0.01"
            min="0"
            defaultValue={sku.unitCost ?? ""}
            placeholder="0,00"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </Field>

        <Field label="Lead time padrão (dias)">
          <input
            name="defaultLeadTimeDays"
            type="number"
            step="1"
            min="0"
            defaultValue={sku.defaultLeadTimeDays ?? ""}
            placeholder="Ex: 7"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </Field>
      </div>

      <Field label="Fornecedor principal">
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
              name="primarySupplierId"
              defaultValue={sku.primarySupplierId ?? ""}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Nenhum</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="newSupplierName"
              placeholder="Nome do fornecedor"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          )}
        </div>
      </Field>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

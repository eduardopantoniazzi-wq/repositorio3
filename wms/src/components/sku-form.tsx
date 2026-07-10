"use client";

import { useActionState, useEffect, useState } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { createSku, type SkuFormState } from "@/lib/actions/skus";

type Supplier = { id: string; name: string };
type SimilarMatch = {
  id: string;
  internalCode: string;
  description: string;
  unitOfMeasure: string;
  score: number;
};

export function SkuForm({
  unitId,
  unitLabel,
  suppliers,
}: {
  unitId: string;
  unitLabel: string;
  suppliers: Supplier[];
}) {
  const [state, formAction, pending] = useActionState<SkuFormState, FormData>(createSku, undefined);

  const [description, setDescription] = useState("");
  const debouncedDescription = useDebouncedValue(description, 400);
  const [matches, setMatches] = useState<SimilarMatch[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [supplierMode, setSupplierMode] = useState<"existing" | "new">(
    suppliers.length > 0 ? "existing" : "new"
  );

  const queryTooShort = debouncedDescription.trim().length < 3;

  useEffect(() => {
    if (queryTooShort) return;
    const controller = new AbortController();
    fetch(
      `/api/skus/similar?unitId=${encodeURIComponent(unitId)}&q=${encodeURIComponent(debouncedDescription)}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((data) => setMatches(data.matches ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [debouncedDescription, unitId, queryTooShort]);

  const matchesToShow = queryTooShort ? [] : matches;
  const hasWarning = matchesToShow.length > 0;
  const canSubmit = !hasWarning || confirmed;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="unitId" value={unitId} />

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
          placeholder="Ex: EMB-009"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </Field>

      <Field label="Descrição" error={state?.fieldErrors?.description?.[0]}>
        <input
          name="description"
          required
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setConfirmed(false);
          }}
          placeholder="Ex: Saco papel kraft 25kg - Trigo Especial"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </Field>

      {hasWarning && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">
            Encontramos SKUs parecidos já cadastrados nesta unidade. Confira antes de continuar:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {matchesToShow.map((m) => (
              <li key={m.id}>
                <span className="font-mono">{m.internalCode}</span> — {m.description} ({m.unitOfMeasure})
              </li>
            ))}
          </ul>
          <label className="mt-3 flex items-start gap-2 text-sm text-amber-900">
            <input
              type="checkbox"
              name="confirmedNotDuplicate"
              value="yes"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            Confirmo que este é um SKU novo, diferente dos listados acima.
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Unidade de medida" error={state?.fieldErrors?.unitOfMeasure?.[0]}>
          <input
            name="unitOfMeasure"
            required
            placeholder="UN, KG, ROLO..."
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </Field>

        <Field label="Classificação">
          <select
            name="classification"
            defaultValue="C"
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
        disabled={pending || !canSubmit}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Cadastrar SKU"}
      </button>
      {hasWarning && !confirmed && (
        <p className="text-center text-sm text-amber-700">
          Confirme acima que não é um SKU duplicado para habilitar o cadastro.
        </p>
      )}
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

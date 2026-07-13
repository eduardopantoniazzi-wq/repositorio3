"use client";

import { useActionState } from "react";
import { bulkImportSkus, type BulkImportResult } from "@/lib/actions/skus";

export function SkuBulkImportForm({ unitId }: { unitId: string }) {
  const [state, formAction, pending] = useActionState<BulkImportResult | undefined, FormData>(
    bulkImportSkus,
    undefined
  );

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
        <p className="font-medium text-slate-700">Como colar a lista:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Uma embalagem por linha. Pode ser só o nome — o código é gerado automaticamente.</li>
          <li>
            Se quiser trazer mais dados, cole direto de uma planilha (Excel/Google Sheets) com colunas nesta
            ordem: <span className="font-mono text-xs">código, descrição, unidade, fornecedor, custo</span> —
            todas opcionais exceto a descrição.
          </li>
          <li>Esta importação não faz o alerta de SKU parecido (isso vale só para o cadastro individual) — revise a lista antes de colar.</li>
        </ul>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="unitId" value={unitId} />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Lista de embalagens</label>
          <textarea
            name="text"
            required
            rows={12}
            placeholder={"Saco papel kraft 25kg\nSaco papel kraft 10kg\nBig bag 1000kg\n..."}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
          {pending ? "Importando..." : "Importar"}
        </button>
      </form>

      {state?.created && (
        <div className="space-y-4">
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {state.created.length} SKU(s) cadastrado(s) com sucesso.
          </div>
          {state.created.length > 0 && (
            <details className="rounded-lg border border-slate-200 p-3 text-sm" open>
              <summary className="cursor-pointer font-medium text-slate-700">
                Ver cadastrados ({state.created.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {state.created.map((c) => (
                  <li key={c.internalCode} className="text-slate-600">
                    <span className="font-mono text-xs text-slate-500">{c.internalCode}</span> — {c.description}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {state.skipped && state.skipped.length > 0 && (
            <details className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm" open>
              <summary className="cursor-pointer font-medium text-amber-900">
                Linhas puladas ({state.skipped.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {state.skipped.map((s, i) => (
                  <li key={i} className="text-amber-800">
                    Linha {s.line}: {s.description} — {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

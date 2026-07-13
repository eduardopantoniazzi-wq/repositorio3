"use client";

import { removeSku } from "@/lib/actions/skus";

export function RemoveSkuButton({ skuId, description }: { skuId: string; description: string }) {
  return (
    <form
      action={removeSku}
      onSubmit={(e) => {
        if (
          !confirm(
            `Remover "${description}"?\n\nSe já houver movimentação registrada para este SKU, ele será apenas desativado (some das listas de lançamento, mas o histórico é mantido). Se nunca teve movimentação, será excluído.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="skuId" value={skuId} />
      <button type="submit" className="text-sm font-medium text-red-600 hover:underline">
        Remover
      </button>
    </form>
  );
}

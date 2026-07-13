"use client";

import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type SkuOption = {
  id: string;
  internalCode: string;
  description: string;
  unitOfMeasure: string;
  balance: number;
};

// Fast-entry SKU search/autocomplete — no camera, no QR, just type-to-filter.
// Renders a hidden `skuId` input (the field name), so this drops straight
// into any <form action={serverAction}>.
export function SkuPicker({
  unitId,
  name = "skuId",
  required = true,
  onSelect,
}: {
  unitId: string;
  name?: string;
  required?: boolean;
  onSelect?: (sku: SkuOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<SkuOption[]>([]);
  const [selected, setSelected] = useState<SkuOption | null>(null);
  const debouncedQuery = useDebouncedValue(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/skus/search?unitId=${encodeURIComponent(unitId)}&q=${encodeURIComponent(debouncedQuery)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setOptions(data.skus ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [debouncedQuery, unitId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(sku: SkuOption) {
    setSelected(sku);
    setQuery(`${sku.internalCode} — ${sku.description}`);
    setOpen(false);
    onSelect?.(sku);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    onSelect?.(null);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} required={required} />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (selected) setSelected(null);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar SKU por código ou descrição..."
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {selected && (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpar seleção"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      )}
      {open && options.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {options.map((sku) => (
            <li key={sku.id}>
              <button
                type="button"
                onClick={() => select(sku)}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-blue-50"
              >
                <span className="text-sm font-medium text-slate-900">
                  <span className="font-mono text-xs text-slate-500">{sku.internalCode}</span>{" "}
                  {sku.description}
                </span>
                <span className="text-xs text-slate-500">
                  Saldo: {sku.balance.toLocaleString("pt-BR")} {sku.unitOfMeasure}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && debouncedQuery.length > 0 && options.length === 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-lg">
          Nenhum SKU encontrado.
        </div>
      )}
    </div>
  );
}

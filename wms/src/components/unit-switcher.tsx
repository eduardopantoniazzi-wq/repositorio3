"use client";

import { useRef } from "react";
import { setActiveUnit } from "@/lib/actions/units";

type Unit = { id: string; name: string; code: string; active: boolean };

export function UnitSwitcher({ units, currentUnitId }: { units: Unit[]; currentUnitId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setActiveUnit}>
      <select
        name="activeUnitId"
        defaultValue={currentUnitId}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        aria-label="Unidade"
      >
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
            {!u.active ? " (inativa)" : ""}
          </option>
        ))}
      </select>
    </form>
  );
}

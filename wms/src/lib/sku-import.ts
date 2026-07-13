export type ParsedSkuRow = {
  internalCode?: string;
  description: string;
  unitOfMeasure: string;
  supplierName?: string;
  unitCost?: number;
};

export type SkuImportParseError = { line: number; raw: string; reason: string };

// Accepts one packaging item per line, pasted straight from a spreadsheet
// (tab-separated) or typed by hand (plain description, or `;`-separated
// columns). Column order when more than one field is present:
// código;descrição;unidade;fornecedor;custo — all but descrição optional.
export function parseSkuImportText(text: string): {
  rows: ParsedSkuRow[];
  errors: SkuImportParseError[];
} {
  const rows: ParsedSkuRow[] = [];
  const errors: SkuImportParseError[] = [];

  const lines = text.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) return;

    const parts = (line.includes("\t") ? line.split("\t") : line.split(";")).map((p) => p.trim());

    if (parts.length === 1) {
      rows.push({ description: parts[0], unitOfMeasure: "UN" });
      return;
    }

    const [internalCode, description, unitOfMeasure, supplierName, costRaw] = parts;
    if (!description) {
      errors.push({ line: idx + 1, raw, reason: "Descrição vazia." });
      return;
    }

    let unitCost: number | undefined;
    if (costRaw) {
      const normalized = costRaw.replace(/\./g, "").replace(",", ".");
      const parsed = Number(normalized) || Number(costRaw);
      if (!Number.isNaN(parsed)) unitCost = parsed;
    }

    rows.push({
      internalCode: internalCode || undefined,
      description,
      unitOfMeasure: unitOfMeasure || "UN",
      supplierName: supplierName || undefined,
      unitCost,
    });
  });

  return { rows, errors };
}

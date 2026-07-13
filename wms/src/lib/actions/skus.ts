"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { parseSkuImportText } from "@/lib/sku-import";

const SkuSchema = z.object({
  internalCode: z.string().trim().min(1, { error: "Informe o código interno." }),
  description: z.string().trim().min(3, { error: "Descrição muito curta." }),
  unitOfMeasure: z.string().trim().min(1, { error: "Informe a unidade de medida." }),
  classification: z.enum(["A", "B", "C"]),
  unitId: z.string().min(1, { error: "Selecione a unidade." }),
  unitCost: z.coerce.number().nonnegative().optional().nullable(),
  defaultLeadTimeDays: z.coerce.number().int().nonnegative().optional().nullable(),
  primarySupplierId: z.string().optional().nullable(),
  newSupplierName: z.string().trim().optional(),
  confirmedNotDuplicate: z.string().optional(),
});

export type SkuFormState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

export async function createSku(_prevState: SkuFormState, formData: FormData): Promise<SkuFormState> {
  const user = await requireRole("ADMIN", "ESTOQUISTA");

  const parsed = SkuSchema.safeParse({
    internalCode: formData.get("internalCode"),
    description: formData.get("description"),
    unitOfMeasure: formData.get("unitOfMeasure"),
    classification: formData.get("classification"),
    unitId: formData.get("unitId"),
    unitCost: formData.get("unitCost") || undefined,
    defaultLeadTimeDays: formData.get("defaultLeadTimeDays") || undefined,
    primarySupplierId: formData.get("primarySupplierId") || undefined,
    newSupplierName: formData.get("newSupplierName") || undefined,
    confirmedNotDuplicate: formData.get("confirmedNotDuplicate") || undefined,
  });

  if (!parsed.success) {
    return { error: "Verifique os campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  }

  const data = parsed.data;

  if (user.role !== "ADMIN" && user.unitId !== data.unitId) {
    return { error: "Você não tem permissão para cadastrar SKUs nesta unidade." };
  }

  let supplierId = data.primarySupplierId || null;
  if (!supplierId && data.newSupplierName) {
    const supplier = await prisma.supplier.create({ data: { name: data.newSupplierName } });
    supplierId = supplier.id;
  }

  const existing = await prisma.sku.findUnique({
    where: { unitId_internalCode: { unitId: data.unitId, internalCode: data.internalCode } },
  });
  if (existing) {
    return {
      error: `Já existe um SKU com o código "${data.internalCode}" nesta unidade.`,
      fieldErrors: { internalCode: ["Código já utilizado nesta unidade."] },
    };
  }

  const sku = await prisma.sku.create({
    data: {
      internalCode: data.internalCode,
      description: data.description,
      unitOfMeasure: data.unitOfMeasure,
      classification: data.classification,
      unitId: data.unitId,
      unitCost: data.unitCost ?? null,
      defaultLeadTimeDays: data.defaultLeadTimeDays ?? null,
      primarySupplierId: supplierId,
    },
  });

  revalidatePath("/skus");
  redirect(`/skus/${sku.id}`);
}

// ---------------------------------------------------------------------------
// Bulk import — paste a list straight from the existing spreadsheet to
// seed the catalog quickly instead of adding SKUs one by one.
// ---------------------------------------------------------------------------

export type BulkImportResult = {
  error?: string;
  created?: { internalCode: string; description: string }[];
  skipped?: { line: number; description: string; reason: string }[];
};

const AUTO_CODE_PATTERN = /^EMB-(\d+)$/i;

export async function bulkImportSkus(
  _prevState: BulkImportResult | undefined,
  formData: FormData
): Promise<BulkImportResult> {
  const user = await requireRole("ADMIN", "ESTOQUISTA");

  const unitId = formData.get("unitId");
  const text = formData.get("text");
  if (typeof unitId !== "string" || !unitId) return { error: "Selecione a unidade." };
  if (typeof text !== "string" || !text.trim()) return { error: "Cole a lista de embalagens antes de importar." };
  if (user.role !== "ADMIN" && user.unitId !== unitId) {
    return { error: "Você não tem permissão para cadastrar SKUs nesta unidade." };
  }

  const { rows, errors } = parseSkuImportText(text);
  if (rows.length === 0) {
    return { error: "Nenhuma linha válida encontrada para importar." };
  }

  const existingSkus = await prisma.sku.findMany({
    where: { unitId },
    select: { internalCode: true },
  });
  const usedCodes = new Set(existingSkus.map((s) => s.internalCode.toUpperCase()));

  let nextAutoNumber =
    existingSkus.reduce((max, s) => {
      const match = s.internalCode.match(AUTO_CODE_PATTERN);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;

  const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true } });
  const supplierByName = new Map(suppliers.map((s) => [s.name.trim().toLowerCase(), s.id]));

  const created: BulkImportResult["created"] = [];
  const skipped: BulkImportResult["skipped"] = errors.map((e) => ({
    line: e.line,
    description: e.raw,
    reason: e.reason,
  }));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let code = row.internalCode?.trim();

    if (!code) {
      code = `EMB-${String(nextAutoNumber).padStart(3, "0")}`;
      nextAutoNumber++;
    }

    if (usedCodes.has(code.toUpperCase())) {
      skipped.push({ line: i + 1, description: row.description, reason: `Código "${code}" já existe nesta unidade.` });
      continue;
    }

    let supplierId: string | undefined;
    if (row.supplierName) {
      const key = row.supplierName.trim().toLowerCase();
      supplierId = supplierByName.get(key);
      if (!supplierId) {
        const supplier = await prisma.supplier.create({ data: { name: row.supplierName.trim() } });
        supplierId = supplier.id;
        supplierByName.set(key, supplierId);
      }
    }

    await prisma.sku.create({
      data: {
        internalCode: code,
        description: row.description,
        unitOfMeasure: row.unitOfMeasure,
        unitId,
        unitCost: row.unitCost ?? null,
        primarySupplierId: supplierId ?? null,
      },
    });

    usedCodes.add(code.toUpperCase());
    created.push({ internalCode: code, description: row.description });
  }

  revalidatePath("/skus");
  revalidatePath("/saldo");
  return { created, skipped };
}

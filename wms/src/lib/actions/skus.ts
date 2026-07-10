"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

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

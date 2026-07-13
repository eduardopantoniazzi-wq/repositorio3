"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { DESTINATION_LINES } from "@/lib/destination-lines";

async function assertSkuInUserScope(skuId: string, userUnitId: string | null, isAdmin: boolean) {
  const sku = await prisma.sku.findUnique({ where: { id: skuId } });
  if (!sku) throw new Error("SKU não encontrado.");
  if (!isAdmin && sku.unitId !== userUnitId) {
    throw new Error("SKU não pertence à sua unidade.");
  }
  return sku;
}

// requireRole() already re-checks the session against the database, so a
// stale/foreign-key error here means something changed between that check
// and this write (a SKU or supplier removed by someone else in the same
// instant). Surface it as a message the user can act on instead of the
// generic error boundary.
function friendlyWriteError(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
    return "Não foi possível salvar: o SKU ou fornecedor selecionado não existe mais (pode ter sido removido por outra pessoa). Atualize a página e tente novamente.";
  }
  throw e;
}

// ---------------------------------------------------------------------------
// Entrada (receiving)
// ---------------------------------------------------------------------------

const EntradaSchema = z.object({
  skuId: z.string().min(1, { error: "Selecione um SKU." }),
  quantity: z.coerce.number().positive({ error: "Informe uma quantidade maior que zero." }),
  supplierId: z.string().optional(),
  newSupplierName: z.string().trim().optional(),
  invoiceNumber: z.string().trim().min(1, { error: "Informe o número da nota fiscal." }),
  receivedDate: z.string().min(1, { error: "Informe a data de recebimento." }),
  notes: z.string().trim().optional(),
});

export type EntradaFormState = { error?: string; success?: boolean } | undefined;

export async function registerEntrada(
  _prevState: EntradaFormState,
  formData: FormData
): Promise<EntradaFormState> {
  const user = await requireRole("ADMIN", "ESTOQUISTA");

  const parsed = EntradaSchema.safeParse({
    skuId: formData.get("skuId"),
    quantity: formData.get("quantity"),
    supplierId: formData.get("supplierId") || undefined,
    newSupplierName: formData.get("newSupplierName") || undefined,
    invoiceNumber: formData.get("invoiceNumber"),
    receivedDate: formData.get("receivedDate"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos." };
  }
  const data = parsed.data;

  try {
    await assertSkuInUserScope(data.skuId, user.unitId, user.role === "ADMIN");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "SKU inválido." };
  }

  let supplierId = data.supplierId || null;
  if (!supplierId && data.newSupplierName) {
    const supplier = await prisma.supplier.create({ data: { name: data.newSupplierName } });
    supplierId = supplier.id;
  }

  try {
    await prisma.movement.create({
      data: {
        type: "ENTRADA",
        skuId: data.skuId,
        quantity: data.quantity,
        occurredAt: new Date(`${data.receivedDate}T12:00:00`),
        userId: user.userId,
        supplierId,
        invoiceNumber: data.invoiceNumber,
        notes: data.notes || null,
      },
    });
  } catch (e) {
    return { error: friendlyWriteError(e) };
  }

  revalidatePath("/saldo");
  revalidatePath("/entradas");
  revalidatePath(`/skus/${data.skuId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Saída (withdrawal to the packing line) — the critical, must-not-skip flow
// ---------------------------------------------------------------------------

const SaidaSchema = z.object({
  skuId: z.string().min(1, { error: "Selecione um SKU." }),
  quantity: z.coerce.number().positive({ error: "Informe uma quantidade maior que zero." }),
  destinationLine: z.enum(DESTINATION_LINES, { error: "Selecione uma linha de destino válida." }),
  productionOrder: z.string().trim().optional(),
});

export type SaidaFormState = { error?: string; success?: boolean } | undefined;

export async function registerSaida(
  _prevState: SaidaFormState,
  formData: FormData
): Promise<SaidaFormState> {
  const user = await requireRole("ADMIN", "ESTOQUISTA", "OPERADOR_ENVASE");

  const parsed = SaidaSchema.safeParse({
    skuId: formData.get("skuId"),
    quantity: formData.get("quantity"),
    destinationLine: formData.get("destinationLine"),
    productionOrder: formData.get("productionOrder") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos." };
  }
  const data = parsed.data;

  try {
    await assertSkuInUserScope(data.skuId, user.unitId, user.role === "ADMIN");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "SKU inválido." };
  }

  try {
    await prisma.movement.create({
      data: {
        type: "SAIDA",
        skuId: data.skuId,
        quantity: data.quantity,
        occurredAt: new Date(),
        userId: user.userId,
        destinationLine: data.destinationLine,
        productionOrder: data.productionOrder || null,
      },
    });
  } catch (e) {
    return { error: friendlyWriteError(e) };
  }

  revalidatePath("/saldo");
  revalidatePath("/saidas");
  revalidatePath(`/skus/${data.skuId}`);
  return { success: true };
}

export async function listRecentMovements(type: "ENTRADA" | "SAIDA", unitId: string) {
  await requireUser();
  return prisma.movement.findMany({
    where: { type, sku: { unitId } },
    include: { sku: true, user: true, supplier: true },
    orderBy: { occurredAt: "desc" },
    take: 50,
  });
}

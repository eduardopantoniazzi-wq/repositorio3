"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getBalanceForSku } from "@/lib/balance";

const CycleCountSchema = z.object({
  skuId: z.string().min(1, { error: "Selecione um SKU." }),
  countedQuantity: z.coerce.number().nonnegative({ error: "Informe a quantidade contada." }),
});

export type CycleCountFormState = { error?: string; success?: boolean } | undefined;

export async function registerCycleCount(
  _prevState: CycleCountFormState,
  formData: FormData
): Promise<CycleCountFormState> {
  const user = await requireRole("ADMIN", "ESTOQUISTA");

  const parsed = CycleCountSchema.safeParse({
    skuId: formData.get("skuId"),
    countedQuantity: formData.get("countedQuantity"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Verifique os campos." };
  }
  const { skuId, countedQuantity } = parsed.data;

  const sku = await prisma.sku.findUnique({ where: { id: skuId } });
  if (!sku) return { error: "SKU não encontrado." };
  if (user.role !== "ADMIN" && sku.unitId !== user.unitId) {
    return { error: "SKU não pertence à sua unidade." };
  }

  const systemQuantityAtCount = await getBalanceForSku(skuId);
  const divergenceQty = countedQuantity - systemQuantityAtCount;
  const divergencePercent =
    systemQuantityAtCount !== 0
      ? (Math.abs(divergenceQty) / Math.abs(systemQuantityAtCount)) * 100
      : countedQuantity !== 0
        ? 100
        : 0;

  const setting = await prisma.setting.findUnique({ where: { id: 1 } });
  const threshold = setting?.divergenceThresholdPercent ?? 5;
  const withinTolerance = divergencePercent < threshold;

  await prisma.cycleCount.create({
    data: {
      skuId,
      countedQuantity,
      systemQuantityAtCount,
      divergenceQty,
      divergencePercent,
      countedById: user.userId,
      status: withinTolerance ? "REVIEWED_OK" : "PENDING_REVIEW",
      ...(withinTolerance
        ? {
            reviewedById: user.userId,
            reviewedAt: new Date(),
            reviewNotes: "Dentro da tolerância configurada — sem necessidade de revisão.",
          }
        : {}),
    },
  });

  revalidatePath("/contagens");
  revalidatePath("/dashboard");
  return { success: true };
}

const ReviewSchema = z.object({
  cycleCountId: z.string().min(1),
  decision: z.enum(["ok", "adjust"]),
  reviewNotes: z.string().trim().optional(),
});

export async function reviewCycleCount(formData: FormData) {
  const user = await requireRole("ADMIN");

  const parsed = ReviewSchema.safeParse({
    cycleCountId: formData.get("cycleCountId"),
    decision: formData.get("decision"),
    reviewNotes: formData.get("reviewNotes") || undefined,
  });
  if (!parsed.success) return;
  const { cycleCountId, decision, reviewNotes } = parsed.data;

  const count = await prisma.cycleCount.findUnique({ where: { id: cycleCountId } });
  if (!count || count.status !== "PENDING_REVIEW") return;

  if (decision === "adjust") {
    const diff = count.divergenceQty; // counted - system
    if (diff !== 0) {
      const movement = await prisma.movement.create({
        data: {
          type: diff > 0 ? "ENTRADA" : "SAIDA",
          skuId: count.skuId,
          quantity: Math.abs(diff),
          userId: user.userId,
          notes: `Ajuste por contagem cíclica (divergência de ${count.divergencePercent.toFixed(1)}%).`,
        },
      });
      await prisma.cycleCount.update({
        where: { id: cycleCountId },
        data: {
          status: "REVIEWED_ADJUSTED",
          reviewedById: user.userId,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
          adjustmentMovementId: movement.id,
        },
      });
    } else {
      await prisma.cycleCount.update({
        where: { id: cycleCountId },
        data: {
          status: "REVIEWED_OK",
          reviewedById: user.userId,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
        },
      });
    }
  } else {
    await prisma.cycleCount.update({
      where: { id: cycleCountId },
      data: {
        status: "REVIEWED_OK",
        reviewedById: user.userId,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });
  }

  revalidatePath("/contagens");
  revalidatePath("/dashboard");
  redirect("/contagens");
}

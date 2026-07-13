import "server-only";
import { prisma } from "@/lib/prisma";

// Balance is always derived — never stored — from the movement ledger:
// balance = sum(ENTRADA.quantity) - sum(SAIDA.quantity).
export async function getBalancesByUnit(unitId: string): Promise<Map<string, number>> {
  const grouped = await prisma.movement.groupBy({
    by: ["skuId", "type"],
    where: { sku: { unitId } },
    _sum: { quantity: true },
  });

  const balances = new Map<string, number>();
  for (const row of grouped) {
    const current = balances.get(row.skuId) ?? 0;
    const qty = row._sum.quantity ?? 0;
    balances.set(row.skuId, row.type === "ENTRADA" ? current + qty : current - qty);
  }
  return balances;
}

export async function getBalanceForSku(skuId: string): Promise<number> {
  const grouped = await prisma.movement.groupBy({
    by: ["type"],
    where: { skuId },
    _sum: { quantity: true },
  });

  let balance = 0;
  for (const row of grouped) {
    const qty = row._sum.quantity ?? 0;
    balance += row.type === "ENTRADA" ? qty : -qty;
  }
  return balance;
}

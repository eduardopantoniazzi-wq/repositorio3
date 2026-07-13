import "server-only";
import { prisma } from "@/lib/prisma";
import { getBalancesByUnit } from "@/lib/balance";

const COVERAGE_WINDOW_DAYS = 30;

export type CoverageRow = {
  skuId: string;
  internalCode: string;
  description: string;
  unitOfMeasure: string;
  balance: number;
  consumptionPerDay: number;
  daysOfCoverage: number | null; // null = infinite (no consumption in window)
};

export async function getUnitDashboard(unitId: string) {
  const since = new Date(Date.now() - COVERAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [skus, balances, recentSaidas, pendingCounts] = await Promise.all([
    prisma.sku.findMany({ where: { unitId, active: true } }),
    getBalancesByUnit(unitId),
    prisma.movement.groupBy({
      by: ["skuId"],
      where: { type: "SAIDA", occurredAt: { gte: since }, sku: { unitId } },
      _sum: { quantity: true },
    }),
    prisma.cycleCount.findMany({
      where: { status: "PENDING_REVIEW", sku: { unitId } },
      include: { sku: true },
      orderBy: { countedAt: "desc" },
    }),
  ]);

  const consumptionBySku = new Map(recentSaidas.map((r) => [r.skuId, r._sum.quantity ?? 0]));

  const totalValue = skus.reduce((sum, sku) => {
    const balance = balances.get(sku.id) ?? 0;
    return sum + (sku.unitCost ? balance * sku.unitCost : 0);
  }, 0);

  const totalConsumption30d = recentSaidas.reduce((sum, r) => sum + (r._sum.quantity ?? 0), 0);
  const totalBalance = skus.reduce((sum, sku) => sum + (balances.get(sku.id) ?? 0), 0);
  // Approximate annualized turnover: how many times the current stock would
  // be consumed in a year at the recent 30-day pace.
  const turnoverPerYear = totalBalance > 0 ? (totalConsumption30d * 12) / totalBalance : 0;

  const coverage: CoverageRow[] = skus.map((sku) => {
    const balance = balances.get(sku.id) ?? 0;
    const consumption30d = consumptionBySku.get(sku.id) ?? 0;
    const consumptionPerDay = consumption30d / COVERAGE_WINDOW_DAYS;
    const daysOfCoverage = consumptionPerDay > 0 ? balance / consumptionPerDay : null;
    return {
      skuId: sku.id,
      internalCode: sku.internalCode,
      description: sku.description,
      unitOfMeasure: sku.unitOfMeasure,
      balance,
      consumptionPerDay,
      daysOfCoverage,
    };
  });

  // Excess candidates: highest days-of-coverage first; SKUs with stock but
  // zero recent consumption (infinite coverage) are the biggest risk, so
  // they sort to the top.
  const excessCandidates = coverage
    .filter((row) => row.balance > 0)
    .sort((a, b) => {
      if (a.daysOfCoverage === null && b.daysOfCoverage === null) return b.balance - a.balance;
      if (a.daysOfCoverage === null) return -1;
      if (b.daysOfCoverage === null) return 1;
      return b.daysOfCoverage - a.daysOfCoverage;
    })
    .slice(0, 8);

  return {
    skuCount: skus.length,
    totalValue,
    turnoverPerYear,
    excessCandidates,
    pendingCounts,
  };
}

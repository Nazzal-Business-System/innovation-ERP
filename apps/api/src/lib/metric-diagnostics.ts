import { computeFinancialMetrics, computeInventoryValuation } from "./financial-metrics.js";
import { currentMonthBounds } from "./metric-math.js";
import { diagnosePostedRevenue } from "./revenue-diagnostics.js";
import { OPEN_PO_STATUSES } from "./serialize-procurement.js";
import { OPEN_SO_STATUSES } from "./serialize-sales.js";
import { prisma } from "./prisma.js";

export interface MetricDiagnosticRow {
  metricName: string;
  calculatedValue: number | string;
  sourceCount: number;
  dateRange: string;
  includedStatuses: string[];
  excludedStatuses: string[];
  queryTimingMs: number;
  classification: "real" | "estimated" | "capped" | "seeded";
}

async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now();
  const result = await fn();
  return { result, ms: Math.round(performance.now() - start) };
}

/**
 * Development-only metric diagnostics. Never mount in production user UI.
 */
export async function collectMetricDiagnostics(orgId: string, now = new Date()) {
  const period = currentMonthBounds(now);
  const rows: MetricDiagnosticRow[] = [];

  const { result: revenueDiag, ms: revenueDiagMs } = await timed(() =>
    diagnosePostedRevenue(orgId, now)
  );

  {
    const { result, ms } = await timed(() => computeFinancialMetrics(orgId, now));
    rows.push(
      {
        metricName: "Revenue (MTD posted)",
        calculatedValue: result.revenue,
        sourceCount: revenueDiag.postedRevenueJournalCount,
        dateRange: `${period.label} (${period.start.toISOString()} → ${period.end.toISOString()})`,
        includedStatuses: [
          "POSTED journal",
          `revenue accounts: ${revenueDiag.includedRevenueAccountCodes.join(", ")}`,
        ],
        excludedStatuses: ["DRAFT", "VOID", "non-revenue accounts"],
        queryTimingMs: ms + revenueDiagMs,
        classification: "real",
      },
      {
        metricName: "Expenses (MTD posted)",
        calculatedValue: result.expenses,
        sourceCount: result.expenseBreakdown.length,
        dateRange: period.label,
        includedStatuses: ["POSTED journal", "EXPENSE type / expense codes"],
        excludedStatuses: ["DRAFT", "VOID"],
        queryTimingMs: ms,
        classification: "real",
      },
      {
        metricName: "Net Profit (MTD)",
        calculatedValue: result.netProfit,
        sourceCount: 1,
        dateRange: period.label,
        includedStatuses: ["Revenue − Expenses same period"],
        excludedStatuses: [],
        queryTimingMs: ms,
        classification: "real",
      }
    );
  }

  {
    const { result, ms } = await timed(() => computeInventoryValuation(orgId));
    rows.push({
      metricName: "Inventory Value",
      calculatedValue: result.totalInventoryValue,
      sourceCount: result.totalUnits,
      dateRange: "point-in-time",
      includedStatuses: ["ACTIVE product", "isArchived=false"],
      excludedStatuses: ["DRAFT", "DISCONTINUED", "archived"],
      queryTimingMs: ms,
      classification: "real",
    });
  }

  {
    const { result, ms } = await timed(() =>
      prisma.salesOrder.count({
        where: { organizationId: orgId, status: { in: OPEN_SO_STATUSES } },
      })
    );
    rows.push({
      metricName: "Open Sales Orders",
      calculatedValue: result,
      sourceCount: result,
      dateRange: "all time (open statuses)",
      includedStatuses: [...OPEN_SO_STATUSES],
      excludedStatuses: ["DRAFT", "DELIVERED", "INVOICED", "CANCELLED"],
      queryTimingMs: ms,
      classification: "real",
    });
  }

  {
    const { result, ms } = await timed(() =>
      prisma.purchaseOrder.count({
        where: { organizationId: orgId, status: { in: OPEN_PO_STATUSES } },
      })
    );
    rows.push({
      metricName: "Open Purchase Orders",
      calculatedValue: result,
      sourceCount: result,
      dateRange: "all time (open statuses)",
      includedStatuses: [...OPEN_PO_STATUSES],
      excludedStatuses: ["DRAFT", "RECEIVED", "CANCELLED"],
      queryTimingMs: ms,
      classification: "real",
    });
  }

  return {
    organizationId: orgId,
    generatedAt: now.toISOString(),
    period: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    revenue: {
      postedRevenueJournalCount: revenueDiag.postedRevenueJournalCount,
      includedRevenueAccountCodes: revenueDiag.includedRevenueAccountCodes,
      debitTotal: revenueDiag.debitTotal,
      creditTotal: revenueDiag.creditTotal,
      calculatedNetRevenue: revenueDiag.calculatedNetRevenue,
      recognitionBasis: revenueDiag.recognitionBasis,
      excludedJournalStatuses: revenueDiag.excludedJournalStatuses,
      queryTimingMs: revenueDiagMs,
    },
    metrics: rows,
  };
}

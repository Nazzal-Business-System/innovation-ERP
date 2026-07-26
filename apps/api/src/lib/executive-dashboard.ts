import type {
  ActivityTimelineItem,
  BranchOverview,
  BusinessHealthMetric,
  ExecutiveDashboardResponse,
  ExecutiveInsight,
  ExecutiveMetric,
} from "@ierp/shared";
import { prisma } from "./prisma.js";
import { computeFinancialMetrics, computeInventoryValuation } from "./financial-metrics.js";
import { currentMonthBounds, localMonthKey, percentChange, roundMoney } from "./metric-math.js";
import { formatMoney } from "./serialize-accounting.js";
import { OPEN_SO_STATUSES } from "./serialize-sales.js";
import { OPEN_PO_STATUSES } from "./serialize-procurement.js";
import { formatRelativeTime } from "./relative-time.js";

function metricFromChange(
  value: number,
  formatted: string,
  previous: number,
  opts?: { contextLabel?: string; priorLabel?: string }
): ExecutiveMetric {
  const change = percentChange(value, previous, { priorLabel: opts?.priorLabel });
  const comparison =
    opts?.contextLabel && change.comparison === "No comparison data"
      ? opts.contextLabel
      : change.comparison;
  return {
    value,
    formatted,
    trend: change.trend,
    comparison,
    changePercent: change.changePercent,
  };
}

/**
 * Live executive dashboard for an organization.
 * Revenue / expenses / profit = posted GL MTD (same basis as financial reports).
 * Inventory = on-hand × cost. Open orders = non-draft fulfillment statuses.
 */
export async function getExecutiveDashboard(
  orgId: string,
  now = new Date()
): Promise<ExecutiveDashboardResponse> {
  const period = currentMonthBounds(now);
  const [
    financial,
    inventory,
    openOrders,
    activeCustomers,
    activeVendors,
    activeEmployees,
    lowStockCount,
    monthlyOrderBuckets,
    warehouses,
    stockByWarehouse,
    salesByCity,
    recentJournal,
    recentSales,
    recentPos,
  ] = await Promise.all([
    computeFinancialMetrics(orgId, now),
    computeInventoryValuation(orgId),
    prisma.salesOrder.count({
      where: { organizationId: orgId, status: { in: OPEN_SO_STATUSES } },
    }),
    prisma.customer.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.vendor.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.employee.count({
      where: { organizationId: orgId, isActive: true, employmentStatus: "ACTIVE" },
    }),
    (async () => {
      const products = await prisma.product.findMany({
        where: { organizationId: orgId, status: "ACTIVE", isArchived: false },
        select: {
          reorderLevel: true,
          stockBalances: { select: { quantityOnHand: true } },
        },
      });
      return products.filter((p) => {
        const onHand = p.stockBalances.reduce((s: number, b: { quantityOnHand: number }) => s + b.quantityOnHand, 0);
        return onHand <= p.reorderLevel;
      }).length;
    })(),
    prisma.salesOrder.findMany({
      where: {
        organizationId: orgId,
        status: { notIn: ["CANCELLED", "DRAFT"] },
        orderDate: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
      },
      select: { orderDate: true, totalAmount: true },
    }),
    prisma.warehouse.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, city: true, code: true },
      orderBy: { name: "asc" },
      take: 8,
    }),
    prisma.stockBalance.findMany({
      where: { organizationId: orgId },
      include: { product: { select: { costPrice: true } } },
    }),
    prisma.salesOrder.findMany({
      where: {
        organizationId: orgId,
        status: { notIn: ["CANCELLED", "DRAFT"] },
        orderDate: { gte: period.start, lte: period.end },
      },
      select: {
        totalAmount: true,
        customer: { select: { city: true } },
      },
    }),
    prisma.journalEntry.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, entryNumber: true, status: true, createdAt: true, description: true },
    }),
    prisma.salesOrder.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        soNumber: true,
        status: true,
        createdAt: true,
        totalAmount: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: {
        id: true,
        poNumber: true,
        status: true,
        createdAt: true,
        vendor: { select: { name: true } },
      },
    }),
  ]);

  const openPoCount = await prisma.purchaseOrder.count({
    where: { organizationId: orgId, status: { in: OPEN_PO_STATUSES } },
  });

  const warehouseValue = new Map<string, number>();
  for (const b of stockByWarehouse) {
    const v = b.quantityOnHand * Number(b.product.costPrice);
    warehouseValue.set(b.warehouseId, (warehouseValue.get(b.warehouseId) ?? 0) + v);
  }

  const citySales = new Map<string, { revenue: number; orders: number }>();
  for (const so of salesByCity) {
    const city = so.customer.city || "Unknown";
    const cur = citySales.get(city) ?? { revenue: 0, orders: 0 };
    cur.revenue += Number(so.totalAmount);
    cur.orders += 1;
    citySales.set(city, cur);
  }

  const branches: BranchOverview[] = warehouses.map((w) => {
    const cityStats = citySales.get(w.city) ?? { revenue: 0, orders: 0 };
    const inv = roundMoney(warehouseValue.get(w.id) ?? 0);
    return {
      id: w.id,
      name: w.name,
      revenue: formatMoney(cityStats.revenue),
      revenueShare: 0,
      orders: cityStats.orders,
      inventoryValue: formatMoney(inv),
    };
  });
  const branchRevenueTotal = branches.reduce((s, b) => {
    const city = warehouses.find((w) => w.id === b.id)?.city ?? "";
    return s + (citySales.get(city)?.revenue ?? 0);
  }, 0);
  for (const b of branches) {
    const city = warehouses.find((w) => w.id === b.id)?.city ?? "";
    const rev = citySales.get(city)?.revenue ?? 0;
    b.revenueShare =
      branchRevenueTotal > 0 ? Math.round((rev / branchRevenueTotal) * 100) : 0;
  }

  const orderMonthMap = new Map<string, { count: number; revenue: number }>();
  for (const so of monthlyOrderBuckets) {
    const key = localMonthKey(so.orderDate);
    const cur = orderMonthMap.get(key) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(so.totalAmount);
    orderMonthMap.set(key, cur);
  }
  const monthKeys = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return localMonthKey(d);
  });
  const monthlyOrders = monthKeys.map((label) => ({
    label,
    value: orderMonthMap.get(label)?.count ?? 0,
  }));

  const revenueTrend =
    financial.revenueTrend.length > 0
      ? financial.revenueTrend
      : monthKeys.map((label) => ({ label, value: 0, secondary: 0 }));

  const businessHealth: BusinessHealthMetric[] = [
    {
      id: "trial-balance",
      label: "Trial Balance",
      value: financial.trialBalanceStatus.isBalanced ? "Balanced" : "Out of balance",
      status: financial.trialBalanceStatus.isBalanced ? "healthy" : "critical",
      description: financial.trialBalanceStatus.isBalanced
        ? `Posted debits ${financial.trialBalanceStatus.totalDebit} = credits ${financial.trialBalanceStatus.totalCredit}`
        : "Posted journal debits do not equal credits — review journal entries",
    },
    {
      id: "inventory",
      label: "Inventory Health",
      value: lowStockCount === 0 ? "Healthy" : `${lowStockCount} low SKU`,
      status: lowStockCount === 0 ? "healthy" : lowStockCount > 10 ? "warning" : "info",
      description:
        lowStockCount === 0
          ? "No active products at or below reorder level"
          : `${lowStockCount} active product(s) at or below reorder level`,
    },
    {
      id: "sales",
      label: "Sales Trend (MTD)",
      value: formatMoney(financial.revenue),
      status: financial.revenue >= financial.priorRevenue ? "healthy" : "warning",
      description: percentChange(financial.revenue, financial.priorRevenue).comparison,
    },
    {
      id: "operations",
      label: "Open Pipeline",
      value: `${openOrders} SO · ${openPoCount} PO`,
      status: openOrders + openPoCount > 0 ? "info" : "healthy",
      description: "Confirmed/picking/ready sales orders and open purchase orders",
    },
  ];

  const insights: ExecutiveInsight[] = [];
  if (financial.netProfit < 0) {
    insights.push({
      id: "profit-neg",
      message: `Net profit is negative for ${period.label} (${formatMoney(financial.netProfit)}).`,
      type: "attention",
      category: "Finance",
    });
  } else {
    insights.push({
      id: "profit-pos",
      message: `Posted net profit for ${period.label} is ${formatMoney(financial.netProfit)}.`,
      type: "positive",
      category: "Finance",
    });
  }
  if (lowStockCount > 0) {
    insights.push({
      id: "low-stock",
      message: `${lowStockCount} active SKU(s) are at or below reorder level.`,
      type: "attention",
      category: "Inventory",
    });
  }
  if (openOrders > 0) {
    insights.push({
      id: "open-so",
      message: `${openOrders} open sales order(s) awaiting fulfillment (confirmed / picking / ready to ship).`,
      type: "neutral",
      category: "Sales",
    });
  }
  if (!financial.trialBalanceStatus.isBalanced) {
    insights.push({
      id: "tb",
      message: "Posted trial balance is out of balance — investigate journal entries.",
      type: "attention",
      category: "Accounting",
    });
  }
  if (insights.length < 2) {
    insights.push({
      id: "inventory-value",
      message: `Inventory on-hand valuation is ${formatMoney(inventory.totalInventoryValue)} (${inventory.totalUnits.toLocaleString()} units).`,
      type: "positive",
      category: "Inventory",
    });
  }

  const activities: Array<ActivityTimelineItem & { at: Date }> = [];
  for (const je of recentJournal) {
    activities.push({
      id: `je-${je.id}`,
      title: je.status === "POSTED" ? "Journal posted" : "Journal draft",
      description: `${je.entryNumber}${je.description ? ` · ${je.description}` : ""}`,
      time: formatRelativeTime(je.createdAt),
      category: "finance",
      status: je.status === "POSTED" ? "active" : "draft",
      at: je.createdAt,
    });
  }
  for (const so of recentSales) {
    activities.push({
      id: `so-${so.id}`,
      title: "Sales order",
      description: `${so.soNumber} · ${so.customer.name} · ${formatMoney(Number(so.totalAmount))} · ${so.status}`,
      time: formatRelativeTime(so.createdAt),
      category: "sales",
      status: "active",
      at: so.createdAt,
    });
  }
  for (const po of recentPos) {
    activities.push({
      id: `po-${po.id}`,
      title: "Purchase order",
      description: `${po.poNumber} · ${po.vendor.name} · ${po.status}`,
      time: formatRelativeTime(po.createdAt),
      category: "operations",
      status: "info",
      at: po.createdAt,
    });
  }
  activities.sort((a, b) => b.at.getTime() - a.at.getTime());
  const activityOut: ActivityTimelineItem[] = activities.slice(0, 8).map(({ at: _at, ...rest }) => rest);

  const branchComparison = branches.slice(0, 6).map((b) => {
    const city = warehouses.find((w) => w.id === b.id)?.city ?? "";
    return {
      label: b.name,
      value: roundMoney(citySales.get(city)?.revenue ?? 0),
      secondary: b.orders,
    };
  });

  return {
    currency: "JOD",
    period: `${period.label} (MTD · posted ledger)`,
    generatedAt: now.toISOString(),
    kpis: {
      revenue: metricFromChange(
        financial.revenue,
        formatMoney(financial.revenue),
        financial.priorRevenue
      ),
      expenses: metricFromChange(
        financial.expenses,
        formatMoney(financial.expenses),
        financial.priorExpenses
      ),
      profit: metricFromChange(
        financial.netProfit,
        formatMoney(financial.netProfit),
        financial.priorNetProfit
      ),
      inventoryValue: {
        value: inventory.totalInventoryValue,
        formatted: formatMoney(inventory.totalInventoryValue),
        trend: "neutral",
        comparison: `${inventory.totalUnits.toLocaleString()} units on hand · at cost`,
        changePercent: undefined,
      },
      openOrders: {
        value: openOrders,
        formatted: String(openOrders),
        trend: "neutral",
        comparison: "Confirmed, picking, or ready to ship",
      },
      customers: {
        value: activeCustomers,
        formatted: String(activeCustomers),
        trend: "neutral",
        comparison: "Active customer accounts",
      },
      vendors: {
        value: activeVendors,
        formatted: String(activeVendors),
        trend: "neutral",
        comparison: "Active vendor accounts",
      },
      employees: {
        value: activeEmployees,
        formatted: String(activeEmployees),
        trend: "neutral",
        comparison: "Active employees",
      },
    },
    businessHealth,
    branches,
    insights: insights.slice(0, 5),
    activities: activityOut,
    charts: {
      revenueTrend,
      monthlyOrders,
      branchComparison,
    },
  };
}

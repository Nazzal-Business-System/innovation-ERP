/**
 * SEED/DEMO ONLY — hardcoded executive dashboard figures.
 * Must NOT be served by API routes. Retained for design/fixture reference.
 * Live data: `getExecutiveDashboard` in executive-dashboard.ts
 */
import type { ExecutiveDashboardResponse } from "@ierp/shared";

function metric(
  value: number,
  formatted: string,
  trend: "up" | "down" | "neutral",
  comparison: string,
  changePercent?: number
) {
  return { value, formatted, trend, comparison, changePercent };
}

export function getExecutiveDashboardDemo(): ExecutiveDashboardResponse {
  return {
    currency: "JOD",
    period: "June 2026",
    generatedAt: new Date().toISOString(),
    kpis: {
      revenue: metric(2840000, "JOD 2.84M", "up", "+14.2% vs last month", 14.2),
      expenses: metric(2120000, "JOD 2.12M", "up", "+9.8% vs last month", 9.8),
      profit: metric(720000, "JOD 720K", "up", "+22.6% margin improvement", 22.6),
      inventoryValue: metric(1450000, "JOD 1.45M", "neutral", "42-day turnover · healthy", 0),
      openOrders: metric(47, "47", "up", "+12% this week", 12),
      customers: metric(312, "312", "up", "+18 new this month", 5.8),
      vendors: metric(48, "48", "neutral", "3 pending onboarding", 0),
      employees: metric(86, "86", "up", "+4 hires this quarter", 4.9),
    },
    businessHealth: [
      {
        id: "cash",
        label: "Cash Position",
        value: "JOD 840K",
        status: "healthy",
        description: "14.2 months operating runway at current burn",
      },
      {
        id: "inventory",
        label: "Inventory Health",
        value: "92%",
        status: "healthy",
        description: "Stock coverage optimal · low dead-stock risk",
      },
      {
        id: "sales",
        label: "Sales Trend",
        value: "+14.2%",
        status: "healthy",
        description: "Revenue accelerating vs prior 90-day average",
      },
      {
        id: "operations",
        label: "Operational Status",
        value: "All clear",
        status: "info",
        description: "No critical alerts across branches or warehouses",
      },
    ],
    branches: [
      {
        id: "amman",
        name: "Amman",
        revenue: "JOD 1.79M",
        revenueShare: 63,
        orders: 312,
        inventoryValue: "JOD 920K",
      },
      {
        id: "irbid",
        name: "Irbid",
        revenue: "JOD 1.05M",
        revenueShare: 37,
        orders: 184,
        inventoryValue: "JOD 530K",
      },
    ],
    insights: [
      {
        id: "1",
        message: "Amman branch generated 63% of monthly revenue — strongest wholesale corridor performance.",
        type: "positive",
        category: "Revenue",
      },
      {
        id: "2",
        message: "Inventory turnover remains healthy at 42 days across both branches.",
        type: "positive",
        category: "Inventory",
      },
      {
        id: "3",
        message: "Open orders increased 12% this week — fulfillment capacity should be monitored.",
        type: "attention",
        category: "Operations",
      },
      {
        id: "4",
        message: "Net profit margin improved 2.1 points after vendor renegotiation in Q2.",
        type: "positive",
        category: "Finance",
      },
      {
        id: "5",
        message: "5 active implementation projects on track — average portfolio progress at 62%.",
        type: "positive",
        category: "Projects",
      },
    ],
    activities: [
      {
        id: "1",
        title: "Invoice posted",
        description: "INV-2026-0312 · Gulf Retail Group · JOD 18,400",
        time: "12 min ago",
        category: "finance",
        status: "active",
      },
      {
        id: "2",
        title: "Purchase order approved",
        description: "PO-2026-0087 · Al-Rashid Supplies · 36 line items",
        time: "45 min ago",
        category: "operations",
        status: "info",
      },
      {
        id: "3",
        title: "Employee added",
        description: "Sara Al-Masri · Inventory Associate · Irbid branch",
        time: "2h ago",
        category: "hr",
        status: "active",
      },
      {
        id: "4",
        title: "Stock transfer completed",
        description: "Amman DC → Irbid · 14 SKU · 2,400 units",
        time: "3h ago",
        category: "inventory",
        status: "pending",
      },
      {
        id: "5",
        title: "Sales order confirmed",
        description: "SO-2026-0194 · Jordan Foods Co. · JOD 42,800",
        time: "5h ago",
        category: "sales",
        status: "active",
      },
      {
        id: "6",
        title: "Payment received",
        description: "PAY-2026-0041 · Metro Distributors · JOD 96,200",
        time: "Yesterday",
        category: "finance",
        status: "active",
      },
    ],
    charts: {
      revenueTrend: [
        { label: "Jan", value: 1980000 },
        { label: "Feb", value: 2150000 },
        { label: "Mar", value: 2280000 },
        { label: "Apr", value: 2410000 },
        { label: "May", value: 2490000 },
        { label: "Jun", value: 2840000 },
      ],
      monthlyOrders: [
        { label: "Jan", value: 380 },
        { label: "Feb", value: 412 },
        { label: "Mar", value: 445 },
        { label: "Apr", value: 468 },
        { label: "May", value: 451 },
        { label: "Jun", value: 496 },
      ],
      branchComparison: [
        { label: "Amman", value: 1790000, secondary: 312 },
        { label: "Irbid", value: 1050000, secondary: 184 },
      ],
    },
  };
}

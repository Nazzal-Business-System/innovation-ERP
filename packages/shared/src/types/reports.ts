import type { ChartDataPoint } from "./dashboard";
import type { PurchaseOrderStatus } from "./procurement";
import type { SalesOrderStatus } from "./sales";

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  href: string;
  icon: string;
}

export interface ReportCategory {
  id: string;
  name: string;
  reportCount: number;
  reports: ReportDefinition[];
}

export interface RecentReport {
  id: string;
  name: string;
  category: string;
  generatedAt: string;
  href: string;
}

export interface ReportsExecutiveSummary {
  totalSales: string;
  inventoryValue: string;
  procurementSpend: string;
  netProfit: string;
  openSalesOrders: number;
  openPurchaseOrders: number;
  lowStockItems: number;
}

export interface ReportsOverview {
  totalReports: number;
  availableReports: ReportDefinition[];
  lastGeneratedAt: string;
  executiveSummary: ReportsExecutiveSummary;
  reportCategories: ReportCategory[];
  recentReports: RecentReport[];
}

export interface SalesSummaryReport {
  totalSales: string;
  orderCount: number;
  averageOrderValue: string;
  salesByStatus: Array<{ status: SalesOrderStatus; count: number; amount: string }>;
  topCustomers: Array<{ id: string; code: string; name: string; totalSales: string; orderCount: number }>;
  salesByCity: Array<{ city: string; orderCount: number; totalSales: string }>;
  monthlySalesTrend: ChartDataPoint[];
  generatedAt: string;
}

export interface InventoryValuationReport {
  totalInventoryValue: string;
  totalUnits: number;
  lowStockItems: Array<{ id: string; sku: string; name: string; onHand: number; reorderLevel: number; value: string }>;
  valueByWarehouse: Array<{ id: string; code: string; name: string; totalUnits: number; totalValue: string }>;
  valueByCategory: Array<{ category: string; totalUnits: number; totalValue: string }>;
  topValueProducts: Array<{ id: string; sku: string; name: string; onHand: number; unitCost: string; totalValue: string }>;
  generatedAt: string;
}

export interface ProcurementSummaryReport {
  totalProcurementSpend: string;
  purchaseOrderCount: number;
  openPurchaseOrders: number;
  spendByVendor: Array<{ id: string; code: string; name: string; totalSpend: string; orderCount: number }>;
  purchaseOrdersByStatus: Array<{ status: PurchaseOrderStatus; count: number; amount: string }>;
  expectedReceipts: Array<{ id: string; poNumber: string; vendorName: string; expectedDate: string; totalAmount: string; status: PurchaseOrderStatus }>;
  generatedAt: string;
}

export interface FinancialSummaryReport {
  periodLabel?: string;
  assets: string;
  liabilities: string;
  equity: string;
  revenue: string;
  expenses: string;
  netProfit: string;
  trialBalanceStatus: { isBalanced: boolean; totalDebit: string; totalCredit: string };
  expenseBreakdown: Array<{ accountCode: string; accountName: string; amount: string }>;
  revenueTrend: ChartDataPoint[];
  generatedAt: string;
}

export interface ProjectsSummaryReport {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: string;
  averageProgress: number;
  openTasks: number;
  completedTasks: number;
  overdueMilestones: number;
  projectsByStatus: Array<{ status: string; count: number }>;
  tasksByStatus: Array<{ status: string; count: number }>;
  topProjectsByBudget: Array<{ id: string; code: string; name: string; budget: string; progress: number; status: string }>;
  generatedAt: string;
}

export const REPORTS_PERMISSIONS = {
  READ: "reports.read",
  WRITE: "reports.write",
} as const;

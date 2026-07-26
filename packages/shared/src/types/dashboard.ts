export type TrendDirection = "up" | "down" | "neutral";

export type HealthStatusLevel = "healthy" | "warning" | "critical" | "info";

export type InsightType = "positive" | "neutral" | "attention";

export type ActivityCategory = "finance" | "inventory" | "sales" | "hr" | "operations";

export interface ExecutiveMetric {
  value: number;
  formatted: string;
  trend: TrendDirection;
  comparison: string;
  changePercent?: number;
}

export interface ExecutiveKpis {
  revenue: ExecutiveMetric;
  expenses: ExecutiveMetric;
  profit: ExecutiveMetric;
  inventoryValue: ExecutiveMetric;
  openOrders: ExecutiveMetric;
  customers: ExecutiveMetric;
  vendors: ExecutiveMetric;
  employees: ExecutiveMetric;
}

export interface BusinessHealthMetric {
  id: string;
  label: string;
  value: string;
  status: HealthStatusLevel;
  description: string;
}

export interface BranchOverview {
  id: string;
  name: string;
  revenue: string;
  revenueShare: number;
  orders: number;
  inventoryValue: string;
}

export interface ExecutiveInsight {
  id: string;
  message: string;
  type: InsightType;
  category: string;
}

export interface ActivityTimelineItem {
  id: string;
  title: string;
  description: string;
  time: string;
  category: ActivityCategory;
  status?: "active" | "pending" | "info" | "draft";
}

export interface ChartDataPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface ExecutiveDashboardCharts {
  revenueTrend: ChartDataPoint[];
  monthlyOrders: ChartDataPoint[];
  branchComparison: ChartDataPoint[];
}

export interface ExecutiveDashboardResponse {
  kpis: ExecutiveKpis;
  businessHealth: BusinessHealthMetric[];
  branches: BranchOverview[];
  insights: ExecutiveInsight[];
  activities: ActivityTimelineItem[];
  charts: ExecutiveDashboardCharts;
  currency: string;
  period: string;
  generatedAt: string;
}

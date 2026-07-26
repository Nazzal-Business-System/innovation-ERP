import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ExecutiveKpis, ExecutiveMetric } from "@ierp/shared";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { StaggerChildren, StaggerItem } from "@/components/motion/stagger-children";

const KPI_CONFIG: {
  key: keyof ExecutiveKpis;
  title: string;
  icon: LucideIcon;
  invertTrend?: boolean;
}[] = [
  { key: "revenue", title: "Revenue", icon: DollarSign },
  { key: "expenses", title: "Expenses", icon: TrendingDown, invertTrend: true },
  { key: "profit", title: "Net Profit", icon: TrendingUp },
  { key: "inventoryValue", title: "Inventory Value", icon: Package },
  { key: "openOrders", title: "Open Orders", icon: ShoppingCart },
  { key: "customers", title: "Customers", icon: Users },
  { key: "vendors", title: "Vendors", icon: Truck },
  { key: "employees", title: "Employees", icon: UserCircle },
];

function mapTrend(metric: ExecutiveMetric, invertTrend?: boolean) {
  if (invertTrend && metric.trend === "up") return "down" as const;
  if (invertTrend && metric.trend === "down") return "up" as const;
  return metric.trend;
}

interface ExecutiveKpiGridProps {
  kpis: ExecutiveKpis;
}

export function ExecutiveKpiGrid({ kpis }: ExecutiveKpiGridProps) {
  return (
    <MetricGrid columns={4}>
      <StaggerChildren className="contents">
        {KPI_CONFIG.map(({ key, title, icon, invertTrend }) => {
          const metric = kpis[key];
          return (
            <StaggerItem key={key}>
              <KpiCard
                title={title}
                value={metric.formatted}
                change={metric.comparison}
                trend={mapTrend(metric, invertTrend)}
                icon={icon}
              />
            </StaggerItem>
          );
        })}
      </StaggerChildren>
    </MetricGrid>
  );
}

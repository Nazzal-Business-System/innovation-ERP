"use client";

import dynamic from "next/dynamic";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Banknote, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { FinanceNavLinks } from "@/components/finance/finance-gate";
import { FinancePageSkeleton } from "@/components/finance/finance-page-skeleton";
import { FinanceOverviewRecentTablesSkeleton } from "@/components/finance/finance-overview-recent-tables";
import { useFinanceOverview } from "@/lib/hooks/use-finance";
import { useI18n } from "@/lib/i18n";

const FinanceOverviewRecentTables = dynamic(
  () =>
    import("@/components/finance/finance-overview-recent-tables").then((m) => ({
      default: m.FinanceOverviewRecentTables,
    })),
  { loading: () => <FinanceOverviewRecentTablesSkeleton /> }
);

export default function FinanceOverviewPage() {
  const { t } = useI18n();
  const { data: overview, loading, error, refetch } = useFinanceOverview();

  if (loading && !overview) {
    return (
      <ModuleLayout>
        <FinancePageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title="Unable to load finance" description={error ?? "No data"} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  return (
    <div>
      <ModuleLayout>
        <FadeIn>
          <PageHeader
            title={t("finance.title")}
            description={t("finance.description")}
            badge={<Badge variant="outline">{t("common.liveData")}</Badge>}
          />
        </FadeIn>

        <FadeIn delay={0.04}>
          <FinanceNavLinks />
        </FadeIn>

        <FadeIn delay={0.06}>
          <MetricGrid columns={4}>
            <KpiCard
              title="Accounts Receivable"
              value={overview.accountsReceivable}
              change={`${overview.openInvoices} open invoices`}
              trend="neutral"
              icon={ArrowDownLeft}
            />
            <KpiCard
              title="Accounts Payable"
              value={overview.accountsPayable}
              change={`${overview.openBills} open bills`}
              trend="neutral"
              icon={ArrowUpRight}
            />
            <KpiCard
              title="Overdue AR"
              value={overview.overdueReceivables}
              change="Past due receivables"
              trend={overview.overdueReceivables !== "JOD 0.00" ? "down" : "neutral"}
              icon={AlertTriangle}
            />
            <KpiCard
              title="Overdue AP"
              value={overview.overduePayables}
              change="Past due payables"
              trend={overview.overduePayables !== "JOD 0.00" ? "down" : "neutral"}
              icon={AlertTriangle}
            />
          </MetricGrid>
        </FadeIn>

        <FadeIn delay={0.08}>
          <MetricGrid columns={2}>
            <KpiCard
              title="Cash Collected (Month)"
              value={overview.cashCollectedThisMonth}
              change="Customer payments"
              trend="up"
              icon={Banknote}
            />
            <KpiCard
              title="Payments Made (Month)"
              value={overview.paymentsMadeThisMonth}
              change="Vendor disbursements"
              trend="neutral"
              icon={Receipt}
            />
          </MetricGrid>
        </FadeIn>

        <FinanceOverviewRecentTables overview={overview} />
      </ModuleLayout>
    </div>
  );
}

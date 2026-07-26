"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-display/data-table";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { FinanceNavLinks } from "@/components/finance/finance-gate";
import { FinanceTableSkeleton } from "@/components/finance/finance-page-skeleton";
import { agingItemColumns } from "@/components/finance/finance-columns";
import { useArAging } from "@/lib/hooks/use-finance";

export default function ArAgingPage() {
  const { data, loading, error, refetch } = useArAging();

  if (loading && !data) return <ModuleLayout><FinanceTableSkeleton /></ModuleLayout>;
  if (error || !data) return <ModuleLayout maxWidth="lg"><ErrorState title="Unable to load AR aging" description={error ?? "No data"} onRetry={() => void refetch()} /></ModuleLayout>;

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader title="AR Aging" description="Accounts receivable by aging bucket." badge={<Badge variant="outline">Outstanding {data.totalOutstanding}</Badge>} />
      </FadeIn>
      <FadeIn delay={0.04}><FinanceNavLinks /></FadeIn>
      <FadeIn delay={0.06}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {data.buckets.map((b) => (
            <div key={b.bucket} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--muted-bg)]/40 p-4">
              <p className="text-xs font-medium text-[var(--muted)]">{b.label}</p>
              <p className="mt-2 text-xl font-bold tabular-nums">{b.amount}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{b.count} documents</p>
            </div>
          ))}
        </div>
      </FadeIn>
      <FadeIn delay={0.08}>
        <PremiumCard className="overflow-hidden">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader><CardTitle className="text-base">Receivables detail</CardTitle></CardHeader>
            <CardContent><DataTable columns={agingItemColumns("ar")} data={data.items} pageSize={20} emptyTitle="No outstanding receivables" /></CardContent>
          </Card>
        </PremiumCard>
      </FadeIn>
    </ModuleLayout>
  );
}

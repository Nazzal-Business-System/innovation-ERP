"use client";

import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { PayrollStatusBadge } from "@/components/hr/hr-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDisplayDateRange } from "@/lib/date";
import { useSelfPayroll } from "@/lib/hooks/use-self-service";
import { useI18n } from "@/lib/i18n";

function MoneyRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] py-2 last:border-b-0">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className="ew-ltr-isolate text-sm font-medium tabular-nums">{value ?? "—"}</span>
    </div>
  );
}

export default function MyPayrollPage() {
  const { t, locale } = useI18n();
  const { data, loading, error, refetch } = useSelfPayroll();

  if (loading && !data) {
    return (
      <ModuleLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </ModuleLayout>
    );
  }

  if (error && !data) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("selfService.loadFailed", "Unable to load workspace")}
          description={error}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const rows = data?.data ?? [];
  const latest = data?.latest ?? null;

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("selfService.payrollTitle", "My Payroll")}
          description={t(
            "selfService.payrollDesc",
            "Your own payroll slips and payment status. Other employees are never shown."
          )}
          badge={<Badge variant="secondary">{rows.length}</Badge>}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        {latest ? (
          <section className="rounded-2xl border border-[var(--border-subtle)] p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">
                  {t("selfService.latestSlip", "Latest pay slip")}
                </h3>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">{latest.runNumber}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PayrollStatusBadge status={latest.status} />
                <Badge variant={latest.paymentStatus === "PAID" ? "success" : "secondary"}>
                  {latest.paymentStatus}
                </Badge>
              </div>
            </div>
            <p className="mb-3 ew-ltr-isolate text-sm text-[var(--muted)]">
              {formatDisplayDateRange(latest.periodStart, latest.periodEnd, locale)}
            </p>
            <div className="max-w-md">
              <MoneyRow
                label={t("selfService.baseSalary", "Base salary")}
                value={latest.baseSalary}
              />
              <MoneyRow
                label={t("selfService.allowances", "Allowances")}
                value={latest.allowances}
              />
              <MoneyRow
                label={t("selfService.deductions", "Deductions")}
                value={latest.deductions}
              />
              <MoneyRow label={t("selfService.grossPay", "Gross")} value={latest.grossPay} />
              <MoneyRow label={t("hr.netPay", "Net pay")} value={latest.netPay} />
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center">
            <p className="text-sm text-[var(--muted)]">
              {t("selfService.noPayroll", "No payroll slips yet.")}
            </p>
          </section>
        )}
      </FadeIn>

      <FadeIn delay={0.06}>
        <h3 className="mb-2 text-sm font-semibold">
          {t("selfService.payrollHistory", "Payroll history")}
        </h3>
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("hr.runNumber", "Run")}</TableHead>
                <TableHead>{t("hr.period", "Period")}</TableHead>
                <TableHead>{t("hr.netPay", "Net pay")}</TableHead>
                <TableHead>{t("hr.status", "Status")}</TableHead>
                <TableHead>{t("hr.paymentStatus", "Payment")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-[var(--muted)]">
                    {t("selfService.noPayroll", "No payroll slips yet.")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.runNumber}</TableCell>
                    <TableCell className="ew-ltr-isolate">
                      {formatDisplayDateRange(row.periodStart, row.periodEnd, locale)}
                    </TableCell>
                    <TableCell className="ew-ltr-isolate font-medium tabular-nums">
                      {row.netPay}
                    </TableCell>
                    <TableCell>
                      <PayrollStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.paymentStatus === "PAID" ? "success" : "secondary"}>
                        {row.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}

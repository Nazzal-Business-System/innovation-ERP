"use client";

import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { ContractStatusBadge, ContractTypeLabel } from "@/components/hr/hr-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDisplayDate } from "@/lib/date";
import { useSelfContract } from "@/lib/hooks/use-self-service";
import { useI18n } from "@/lib/i18n";
import type { HrContract } from "@ierp/shared";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-[var(--border-subtle)] py-3 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="text-sm text-[var(--foreground)]">{value || "—"}</dd>
    </div>
  );
}

function ContractDetails({
  contract,
  locale,
  t,
}: {
  contract: HrContract;
  locale: "en" | "ar";
  t: (key: string, fallback?: string) => string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">{contract.contractNumber}</h2>
        <ContractStatusBadge status={contract.status} />
        {contract.isExpiringSoon ? (
          <Badge variant="warning">{t("hr.expiringSoon", "Expiring soon")}</Badge>
        ) : null}
      </div>
      <dl>
        <DetailRow
          label={t("hr.contractType", "Type")}
          value={<ContractTypeLabel type={contract.contractType} />}
        />
        <DetailRow
          label={t("hr.startDate", "Start")}
          value={
            <span className="ew-ltr-isolate">{formatDisplayDate(contract.startDate, locale)}</span>
          }
        />
        <DetailRow
          label={t("hr.endDate", "End")}
          value={
            contract.endDate ? (
              <span className="ew-ltr-isolate">{formatDisplayDate(contract.endDate, locale)}</span>
            ) : (
              t("hr.openEnded", "Open-ended")
            )
          }
        />
        <DetailRow
          label={t("hr.salary", "Salary")}
          value={<span className="ew-ltr-isolate">{contract.salary}</span>}
        />
        <DetailRow label={t("hr.status", "Status")} value={<ContractStatusBadge status={contract.status} />} />
      </dl>
    </section>
  );
}

export default function MyContractPage() {
  const { t, locale } = useI18n();
  const { data, loading, error, refetch } = useSelfContract();

  if (loading && !data) {
    return (
      <ModuleLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-48 w-full rounded-2xl" />
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

  const active = data?.active ?? data?.data ?? null;
  const history = data?.history ?? [];

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("selfService.contractTitle", "My Contract")}
          description={t("selfService.contractDesc", "Your active employment contract.")}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        {active ? (
          <ContractDetails contract={active} locale={locale} t={t} />
        ) : (
          <section className="space-y-4">
            <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-6 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {t("selfService.noContract", "No active contract on file.")}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {history.length > 0
                  ? t("selfService.contractHistory", "Contract history")
                  : t("selfService.noContractHistory", "No contracts on file yet.")}
              </p>
            </div>

            {history.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("hr.contractNumber", "Contract")}</TableHead>
                      <TableHead>{t("hr.contractType", "Type")}</TableHead>
                      <TableHead>{t("hr.startDate", "Start")}</TableHead>
                      <TableHead>{t("hr.endDate", "End")}</TableHead>
                      <TableHead>{t("hr.status", "Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.contractNumber}</TableCell>
                        <TableCell>
                          <ContractTypeLabel type={row.contractType} />
                        </TableCell>
                        <TableCell className="ew-ltr-isolate">
                          {formatDisplayDate(row.startDate, locale)}
                        </TableCell>
                        <TableCell className="ew-ltr-isolate">
                          {row.endDate
                            ? formatDisplayDate(row.endDate, locale)
                            : t("hr.openEnded", "Open-ended")}
                        </TableCell>
                        <TableCell>
                          <ContractStatusBadge status={row.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </section>
        )}
      </FadeIn>

      {active && history.length > 1 ? (
        <FadeIn delay={0.06}>
          <h3 className="mb-2 text-sm font-semibold">
            {t("selfService.contractHistory", "Contract history")}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("hr.contractNumber", "Contract")}</TableHead>
                  <TableHead>{t("hr.startDate", "Start")}</TableHead>
                  <TableHead>{t("hr.endDate", "End")}</TableHead>
                  <TableHead>{t("hr.status", "Status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.contractNumber}</TableCell>
                    <TableCell className="ew-ltr-isolate">
                      {formatDisplayDate(row.startDate, locale)}
                    </TableCell>
                    <TableCell className="ew-ltr-isolate">
                      {row.endDate
                        ? formatDisplayDate(row.endDate, locale)
                        : t("hr.openEnded", "Open-ended")}
                    </TableCell>
                    <TableCell>
                      <ContractStatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </FadeIn>
      ) : null}
    </ModuleLayout>
  );
}

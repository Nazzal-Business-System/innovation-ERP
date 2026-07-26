"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleLayout } from "@/components/layout/module-layout";
import { FinanceNavLinks } from "@/components/finance/finance-gate";
import { FinanceDetailSkeleton } from "@/components/finance/finance-page-skeleton";
import { PaymentMethodBadge } from "@/components/finance/finance-status-badge";
import {
  EntityAudit,
  EntityFieldGrid,
  EntityHeader,
  EntityMetrics,
  EntityNotes,
  EntityOwner,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTimeline,
  EntityTitle,
  FinancialWorkspace,
} from "@/components/entity-workspace";
import { statusLabel, transactionStatusVariant } from "@/lib/entity-workspace/transaction-status";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/date";
import { useVendorPayment } from "@/lib/hooks/use-finance";
import { useI18n } from "@/lib/i18n";

export default function VendorPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { data: payment, loading, error, refetch } = useVendorPayment(id);

  if (loading) {
    return (
      <ModuleLayout>
        <FinanceDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !payment) {
    return (
      <ModuleLayout maxWidth="lg">
        <FinancialWorkspace
          entityType="vendor_payment"
          entityId={id}
          error={error ?? t("finance.paymentNotFound", "Payment not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const relationItems = [
    {
      id: "vendor",
      label: payment.vendor.name,
      description: t("transaction.vendor", "Vendor"),
      meta: payment.vendor.code,
      href: `/dashboard/procurement/vendors/${payment.vendor.id}`,
    },
    {
      id: "bill",
      label: payment.allocation.billNumber,
      description: t("finance.bill", "Bill"),
      meta: statusLabel(payment.allocation.billStatus),
      href: `/dashboard/finance/vendor-bills/${payment.allocation.billId}`,
    },
    ...(payment.journalEntry
      ? [
          {
            id: "journal",
            label: payment.journalEntry.entryNumber,
            description: t("finance.journalEntry", "Journal entry"),
            meta: statusLabel(payment.journalEntry.status),
            href: `/dashboard/accounting/journal-entries/${payment.journalEntry.id}`,
          },
        ]
      : []),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/finance/vendor-payments">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("finance.backToPayments", "Back to payments")}
          </Link>
        </Button>
      </div>

      <FinanceNavLinks />

      <FinancialWorkspace
        entityType="vendor_payment"
        entityId={payment.id}
        readOnly
        header={
          <EntityHeader
            breadcrumbs={[
              {
                label: t("nav.vendorPayments", "Vendor payments"),
                href: "/dashboard/finance/vendor-payments",
              },
              { label: payment.paymentNumber },
            ]}
          >
            <EntityTitle
              title={<span className="ew-ltr-isolate">{payment.paymentNumber}</span>}
              subtitle={`${payment.vendor.name} · ${payment.allocation.billNumber}`}
              trailing={
                <EntityStatus
                  label={t("finance.recorded", "Recorded")}
                  variant={transactionStatusVariant("PAID")}
                />
              }
            />
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              { id: "amount", label: t("finance.paymentAmount", "Payment amount"), value: payment.amount },
              {
                id: "applied",
                label: t("finance.applied", "Applied"),
                value: payment.allocation.amountApplied,
              },
              {
                id: "remaining",
                label: t("finance.billRemaining", "Bill remaining"),
                value: payment.allocation.remainingBalance,
              },
              {
                id: "date",
                label: t("finance.paymentDate", "Payment date"),
                value: formatDisplayDate(payment.paymentDate, locale),
              },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="overview" title={t("entityWorkspace.summary")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  {
                    id: "vendor",
                    label: t("transaction.vendor", "Vendor"),
                    value: (
                      <Link
                        href={`/dashboard/procurement/vendors/${payment.vendor.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {payment.vendor.name}
                      </Link>
                    ),
                  },
                  {
                    id: "bill",
                    label: t("finance.bill", "Bill"),
                    value: (
                      <Link
                        href={`/dashboard/finance/vendor-bills/${payment.allocation.billId}`}
                        className="ew-ltr-isolate text-[var(--accent)] hover:underline"
                      >
                        {payment.allocation.billNumber}
                      </Link>
                    ),
                  },
                  {
                    id: "method",
                    label: t("finance.method", "Method"),
                    value: <PaymentMethodBadge method={payment.paymentMethod} />,
                  },
                  {
                    id: "reference",
                    label: t("finance.reference", "Reference"),
                    value: payment.reference ?? "—",
                    mono: true,
                  },
                  {
                    id: "bill-total",
                    label: t("finance.billTotal", "Bill total"),
                    value: payment.allocation.billTotal,
                    mono: true,
                  },
                  {
                    id: "bill-status",
                    label: t("finance.billStatus", "Bill status"),
                    value: statusLabel(payment.allocation.billStatus),
                  },
                ]}
              />
            </EntitySection>

            <EntityNotes notes={payment.notes ? [{ id: "notes", body: payment.notes }] : []} />

            <EntityTimeline
              events={[
                {
                  id: "recorded",
                  title: t("finance.paymentRecorded", "Payment recorded"),
                  at: payment.createdAt
                    ? formatDisplayDateTime(payment.createdAt, locale)
                    : formatDisplayDate(payment.paymentDate, locale),
                  actor: payment.createdBy?.name,
                  description: `${payment.amount} · ${payment.allocation.billNumber}`,
                },
              ]}
            />

            <EntityAudit
              meta={{
                id: payment.id,
                createdAt: payment.createdAt
                  ? formatDisplayDateTime(payment.createdAt, locale)
                  : formatDisplayDate(payment.paymentDate, locale),
                createdBy: payment.createdBy?.name,
              }}
            />
          </>
        }
        sidebar={
          <>
            {payment.createdBy ? (
              <EntityOwner
                name={payment.createdBy.name}
                role={t("transaction.createdBy", "Created by")}
              />
            ) : null}
            <EntityRelations items={relationItems} />
          </>
        }
      />
    </ModuleLayout>
  );
}

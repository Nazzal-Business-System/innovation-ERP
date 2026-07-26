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
import { useCustomerPayment } from "@/lib/hooks/use-finance";
import { useI18n } from "@/lib/i18n";

export default function CustomerPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { data: payment, loading, error, refetch } = useCustomerPayment(id);

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
          entityType="customer_payment"
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
      id: "customer",
      label: payment.customer.name,
      description: t("transaction.customer", "Customer"),
      meta: payment.customer.code,
      href: `/dashboard/sales/customers/${payment.customer.id}`,
    },
    {
      id: "invoice",
      label: payment.allocation.invoiceNumber,
      description: t("finance.invoice", "Invoice"),
      meta: statusLabel(payment.allocation.invoiceStatus),
      href: `/dashboard/finance/customer-invoices/${payment.allocation.invoiceId}`,
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
          <Link href="/dashboard/finance/customer-payments">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("finance.backToPayments", "Back to payments")}
          </Link>
        </Button>
      </div>

      <FinanceNavLinks />

      <FinancialWorkspace
        entityType="customer_payment"
        entityId={payment.id}
        readOnly
        header={
          <EntityHeader
            breadcrumbs={[
              {
                label: t("nav.customerPayments", "Customer payments"),
                href: "/dashboard/finance/customer-payments",
              },
              { label: payment.paymentNumber },
            ]}
          >
            <EntityTitle
              title={<span className="ew-ltr-isolate">{payment.paymentNumber}</span>}
              subtitle={`${payment.customer.name} · ${payment.allocation.invoiceNumber}`}
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
                label: t("finance.invoiceRemaining", "Invoice remaining"),
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
                    id: "customer",
                    label: t("transaction.customer", "Customer"),
                    value: (
                      <Link
                        href={`/dashboard/sales/customers/${payment.customer.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {payment.customer.name}
                      </Link>
                    ),
                  },
                  {
                    id: "invoice",
                    label: t("finance.invoice", "Invoice"),
                    value: (
                      <Link
                        href={`/dashboard/finance/customer-invoices/${payment.allocation.invoiceId}`}
                        className="ew-ltr-isolate text-[var(--accent)] hover:underline"
                      >
                        {payment.allocation.invoiceNumber}
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
                    id: "invoice-total",
                    label: t("finance.invoiceTotal", "Invoice total"),
                    value: payment.allocation.invoiceTotal,
                    mono: true,
                  },
                  {
                    id: "invoice-status",
                    label: t("finance.invoiceStatus", "Invoice status"),
                    value: statusLabel(payment.allocation.invoiceStatus),
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
                  description: `${payment.amount} · ${payment.allocation.invoiceNumber}`,
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

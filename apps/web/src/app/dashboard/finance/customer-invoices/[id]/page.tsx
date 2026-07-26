"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Banknote, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-display/data-table";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { ModuleLayout } from "@/components/layout/module-layout";
import { FinanceNavLinks } from "@/components/finance/finance-gate";
import { FinanceDetailSkeleton } from "@/components/finance/finance-page-skeleton";
import { customerPaymentColumns } from "@/components/finance/finance-columns";
import { RecordCustomerPaymentDialog } from "@/components/finance/record-customer-payment-dialog";
import {
  EntityActionBar,
  EntityAudit,
  EntityEmptyState,
  EntityFieldGrid,
  EntityHeader,
  EntityLinkedAttachments,
  EntityMetrics,
  EntityNotes,
  EntityOwner,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTableSection,
  EntityTimeline,
  EntityTitle,
  EntityWorkflow,
  FinancialWorkspace,
  TransactionalLineTable,
} from "@/components/entity-workspace";
import { invoiceLineColumns } from "@/components/entity-workspace/transactional-line-columns";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/date";
import { parseMoney } from "@/lib/form-utils";
import { useCustomerInvoice, useSendCustomerInvoice } from "@/lib/hooks/use-finance";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { ACCOUNTING_PERMISSIONS, FINANCE_PERMISSIONS, INVENTORY_PERMISSIONS } from "@ierp/shared";

const INVOICE_WORKFLOW = [
  { id: "DRAFT", label: "Draft" },
  { id: "SENT", label: "Sent" },
  { id: "PARTIALLY_PAID", label: "Partially paid" },
  { id: "PAID", label: "Paid" },
];

export default function CustomerInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(FINANCE_PERMISSIONS.WRITE) || has(ACCOUNTING_PERMISSIONS.WRITE);
  const canLinkProducts = has(INVENTORY_PERMISSIONS.READ);
  const { data: invoice, loading, error, refetch } = useCustomerInvoice(id);
  const sendMutation = useSendCustomerInvoice();
  const [pending, setPending] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const lineColumns = useMemo(() => invoiceLineColumns(canLinkProducts), [canLinkProducts]);

  async function handleSend() {
    if (sendMutation.isPending) return;
    setPending(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await sendMutation.mutateAsync({ id });
      setActionSuccess(t("action.invoiceSent"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <ModuleLayout>
        <FinanceDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !invoice) {
    return (
      <ModuleLayout maxWidth="lg">
        <FinancialWorkspace
          entityType="customer_invoice"
          entityId={id}
          error={error ?? t("finance.invoiceNotFound", "Invoice not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const canSend = canWrite && invoice.canSend;
  const canRecordPayment =
    canWrite &&
    parseMoney(invoice.balanceDue) > 0 &&
    !["DRAFT", "VOID", "PAID"].includes(invoice.status);

  const workflowCurrent =
    invoice.status === "VOID"
      ? "DRAFT"
      : invoice.status === "OVERDUE"
        ? "SENT"
        : invoice.status === "PAID"
          ? "PAID"
          : invoice.status === "PARTIALLY_PAID"
            ? "PARTIALLY_PAID"
            : invoice.status === "SENT"
              ? "SENT"
              : "DRAFT";

  const headerActions: EntityAction[] = [
    ...(canSend
      ? [
          {
            id: "send-invoice",
            label: t("action.sendInvoice"),
            icon: <Send className="h-3.5 w-3.5" aria-hidden />,
            kind: "primary" as const,
            capability: "transition" as const,
            pending,
            confirm: "soft" as const,
            confirmTitle: t("action.sendInvoice"),
            confirmDescription: t("action.sendInvoiceConfirm"),
            onSelect: () => void handleSend(),
          },
        ]
      : []),
    ...(canRecordPayment
      ? [
          {
            id: "record-payment",
            label: t("form.recordPayment"),
            icon: <Banknote className="h-3.5 w-3.5" aria-hidden />,
            kind: (canSend ? "secondary" : "primary") as "primary" | "secondary",
            capability: "createRelated" as const,
            onSelect: () => setShowPayment(true),
          },
        ]
      : []),
  ];

  const relationItems = [
    {
      id: "customer",
      label: invoice.customer.name,
      description: t("transaction.customer", "Customer"),
      meta: invoice.customer.code,
      href: `/dashboard/sales/customers/${invoice.customer.id}`,
    },
    ...(invoice.salesOrder
      ? [
          {
            id: "sales-order",
            label: invoice.salesOrder.soNumber,
            description: t("transaction.salesOrder", "Sales order"),
            href: `/dashboard/sales/orders/${invoice.salesOrder.id}`,
          },
        ]
      : []),
    ...invoice.payments.map((payment) => ({
      id: `payment-${payment.id}`,
      label: payment.paymentNumber,
      description: t("finance.payment", "Payment"),
      meta: payment.amount,
      href: `/dashboard/finance/customer-payments/${payment.id}`,
    })),
    ...(invoice.journalEntry
      ? [
          {
            id: "journal",
            label: invoice.journalEntry.entryNumber,
            description: t("finance.journalEntry", "Journal entry"),
            meta: statusLabel(invoice.journalEntry.status),
            href: `/dashboard/accounting/journal-entries/${invoice.journalEntry.id}`,
          },
        ]
      : []),
  ];

  const timelineEvents = [
    ...(invoice.createdAt
      ? [
          {
            id: "created",
            title: t("finance.created", "Created"),
            at: formatDisplayDateTime(invoice.createdAt, locale),
            actor: invoice.createdBy?.name,
          },
        ]
      : []),
    ...(invoice.sentAt
      ? [
          {
            id: "sent",
            title: t("finance.sent", "Sent"),
            at: formatDisplayDateTime(invoice.sentAt, locale),
          },
        ]
      : []),
    ...invoice.payments.map((payment) => ({
      id: `paid-${payment.id}`,
      title: t("finance.paymentRecorded", "Payment recorded"),
      description: `${payment.paymentNumber} · ${payment.amount}`,
      at: formatDisplayDate(payment.paymentDate, locale),
      actor: payment.createdBy?.name,
    })),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/finance/customer-invoices">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("finance.backToInvoices", "Back to invoices")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <FinanceNavLinks />

      <RecordCustomerPaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        balanceDue={invoice.balanceDue}
        onSuccess={() => {
          setActionSuccess(t("form.paymentRecorded"));
        }}
      />

      <FinancialWorkspace
        entityType="customer_invoice"
        entityId={invoice.id}
        header={
          <EntityHeader
            breadcrumbs={[
              {
                label: t("nav.customerInvoices", "Customer invoices"),
                href: "/dashboard/finance/customer-invoices",
              },
              { label: invoice.invoiceNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={<span className="ew-ltr-isolate">{invoice.invoiceNumber}</span>}
                  subtitle={`${invoice.customer.name} · Due ${formatDisplayDate(invoice.dueDate, locale)}`}
                  trailing={
                    <EntityStatus
                      label={statusLabel(invoice.status)}
                      variant={transactionStatusVariant(invoice.status)}
                    />
                  }
                />
              </div>
              <EntityActionBar
                actions={headerActions}
                capabilities={canWrite ? ["transition", "createRelated"] : []}
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              { id: "subtotal", label: t("transaction.subtotal", "Subtotal"), value: invoice.subtotal },
              { id: "tax", label: t("transaction.tax", "Tax"), value: invoice.taxAmount },
              { id: "total", label: t("transaction.total", "Total"), value: invoice.totalAmount },
              { id: "paid", label: t("finance.paid", "Paid"), value: invoice.amountPaid },
              { id: "balance", label: t("finance.balanceDue", "Balance due"), value: invoice.balanceDue },
              {
                id: "due",
                label: t("finance.dueDate", "Due date"),
                value: formatDisplayDate(invoice.dueDate, locale),
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
                        href={`/dashboard/sales/customers/${invoice.customer.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {invoice.customer.name}
                      </Link>
                    ),
                  },
                  {
                    id: "invoice-date",
                    label: t("finance.invoiceDate", "Invoice date"),
                    value: formatDisplayDate(invoice.invoiceDate, locale),
                    mono: true,
                  },
                  {
                    id: "due-date",
                    label: t("finance.dueDate", "Due date"),
                    value: formatDisplayDate(invoice.dueDate, locale),
                    mono: true,
                  },
                  {
                    id: "sales-order",
                    label: t("transaction.salesOrder", "Sales order"),
                    value: invoice.salesOrder ? (
                      <Link
                        href={`/dashboard/sales/orders/${invoice.salesOrder.id}`}
                        className="ew-ltr-isolate text-[var(--accent)] hover:underline"
                      >
                        {invoice.salesOrder.soNumber}
                      </Link>
                    ) : (
                      "—"
                    ),
                  },
                ]}
              />
            </EntitySection>

            <TransactionalLineTable
              title={t("transaction.lineItems", "Line items")}
              description={t("finance.invoiceLinesDesc", "Products and charges on this invoice")}
              columns={lineColumns}
              data={invoice.lines}
              totals={
                <div className="flex flex-wrap justify-end gap-4 tabular-nums">
                  <span>
                    {t("transaction.subtotal", "Subtotal")}:{" "}
                    <strong className="ew-ltr-isolate">{invoice.subtotal}</strong>
                  </span>
                  <span>
                    {t("transaction.tax", "Tax")}:{" "}
                    <strong className="ew-ltr-isolate">{invoice.taxAmount}</strong>
                  </span>
                  <span>
                    {t("transaction.total", "Total")}:{" "}
                    <strong className="ew-ltr-isolate">{invoice.totalAmount}</strong>
                  </span>
                </div>
              }
            />

            <EntityTableSection
              id="payments"
              title={t("finance.payments", "Payments")}
              description={t("finance.invoicePaymentsDesc", "Payments applied to this invoice")}
            >
              {invoice.payments.length === 0 ? (
                <div className="p-4">
                  <EntityEmptyState
                    variant="empty"
                    density="compact"
                    title={t("finance.noPayments", "No payments recorded")}
                  />
                </div>
              ) : (
                <DataTable columns={customerPaymentColumns} data={invoice.payments} pageSize={10} />
              )}
            </EntityTableSection>

            <EntityNotes
              notes={invoice.notes ? [{ id: "notes", body: invoice.notes }] : []}
            />

            <EntityLinkedAttachments
              module="FINANCE"
              entityType="customer_invoice"
              entityId={invoice.id}
            />

            <EntityTimeline events={timelineEvents} />

            <EntityAudit
              meta={{
                id: invoice.id,
                createdAt: invoice.createdAt
                  ? formatDisplayDateTime(invoice.createdAt, locale)
                  : formatDisplayDate(invoice.invoiceDate, locale),
                updatedAt: invoice.updatedAt
                  ? formatDisplayDateTime(invoice.updatedAt, locale)
                  : undefined,
                createdBy: invoice.createdBy?.name,
              }}
            />
          </>
        }
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={statusLabel(invoice.status)}
              steps={
                invoice.status === "VOID"
                  ? [{ id: "VOID", label: "Void", active: true }]
                  : buildLinearWorkflowSteps(INVOICE_WORKFLOW, workflowCurrent)
              }
              defaultOpen
            />
            {invoice.createdBy ? (
              <EntityOwner
                name={invoice.createdBy.name}
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

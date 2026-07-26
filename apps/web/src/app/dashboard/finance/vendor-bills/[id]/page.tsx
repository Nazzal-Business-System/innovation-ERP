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
import { vendorPaymentColumns } from "@/components/finance/finance-columns";
import { RecordVendorPaymentDialog } from "@/components/finance/record-vendor-payment-dialog";
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
import { billLineColumns } from "@/components/entity-workspace/transactional-line-columns";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/date";
import { parseMoney } from "@/lib/form-utils";
import { useReceiveVendorBill, useVendorBill } from "@/lib/hooks/use-finance";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { ACCOUNTING_PERMISSIONS, FINANCE_PERMISSIONS, INVENTORY_PERMISSIONS } from "@ierp/shared";

const BILL_WORKFLOW = [
  { id: "DRAFT", label: "Draft" },
  { id: "RECEIVED", label: "Received" },
  { id: "PARTIALLY_PAID", label: "Partially paid" },
  { id: "PAID", label: "Paid" },
];

export default function VendorBillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(FINANCE_PERMISSIONS.WRITE) || has(ACCOUNTING_PERMISSIONS.WRITE);
  const canLinkProducts = has(INVENTORY_PERMISSIONS.READ);
  const { data: bill, loading, error, refetch } = useVendorBill(id);
  const receiveMutation = useReceiveVendorBill();
  const [pending, setPending] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const lineColumns = useMemo(() => billLineColumns(canLinkProducts), [canLinkProducts]);

  async function handleReceive() {
    if (receiveMutation.isPending) return;
    setPending(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await receiveMutation.mutateAsync({ id });
      setActionSuccess(t("action.billReceived"));
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

  if (error || !bill) {
    return (
      <ModuleLayout maxWidth="lg">
        <FinancialWorkspace
          entityType="vendor_bill"
          entityId={id}
          error={error ?? t("finance.billNotFound", "Bill not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const canReceive = canWrite && bill.canReceive;
  const canRecordPayment =
    canWrite &&
    parseMoney(bill.balanceDue) > 0 &&
    !["DRAFT", "VOID", "PAID"].includes(bill.status);

  const workflowCurrent =
    bill.status === "VOID"
      ? "DRAFT"
      : bill.status === "OVERDUE"
        ? "RECEIVED"
        : bill.status === "PAID"
          ? "PAID"
          : bill.status === "PARTIALLY_PAID"
            ? "PARTIALLY_PAID"
            : bill.status === "RECEIVED"
              ? "RECEIVED"
              : "DRAFT";

  const headerActions: EntityAction[] = [
    ...(canReceive
      ? [
          {
            id: "receive-bill",
            label: t("action.receiveBill"),
            icon: <Send className="h-3.5 w-3.5" aria-hidden />,
            kind: "primary" as const,
            capability: "transition" as const,
            pending,
            confirm: "soft" as const,
            confirmTitle: t("action.receiveBill"),
            confirmDescription: t("action.receiveBillConfirm"),
            onSelect: () => void handleReceive(),
          },
        ]
      : []),
    ...(canRecordPayment
      ? [
          {
            id: "record-payment",
            label: t("form.recordPayment"),
            icon: <Banknote className="h-3.5 w-3.5" aria-hidden />,
            kind: (canReceive ? "secondary" : "primary") as "primary" | "secondary",
            capability: "createRelated" as const,
            onSelect: () => setShowPayment(true),
          },
        ]
      : []),
  ];

  const relationItems = [
    {
      id: "vendor",
      label: bill.vendor.name,
      description: t("transaction.vendor", "Vendor"),
      meta: bill.vendor.code,
      href: `/dashboard/procurement/vendors/${bill.vendor.id}`,
    },
    ...(bill.purchaseOrder
      ? [
          {
            id: "purchase-order",
            label: bill.purchaseOrder.poNumber,
            description: t("transaction.purchaseOrder", "Purchase order"),
            href: `/dashboard/procurement/purchase-orders/${bill.purchaseOrder.id}`,
          },
        ]
      : []),
    ...bill.payments.map((payment) => ({
      id: `payment-${payment.id}`,
      label: payment.paymentNumber,
      description: t("finance.payment", "Payment"),
      meta: payment.amount,
      href: `/dashboard/finance/vendor-payments/${payment.id}`,
    })),
    ...(bill.journalEntry
      ? [
          {
            id: "journal",
            label: bill.journalEntry.entryNumber,
            description: t("finance.journalEntry", "Journal entry"),
            meta: statusLabel(bill.journalEntry.status),
            href: `/dashboard/accounting/journal-entries/${bill.journalEntry.id}`,
          },
        ]
      : []),
  ];

  const timelineEvents = [
    ...(bill.createdAt
      ? [
          {
            id: "created",
            title: t("finance.created", "Created"),
            at: formatDisplayDateTime(bill.createdAt, locale),
            actor: bill.createdBy?.name,
          },
        ]
      : []),
    ...(bill.receivedAt
      ? [
          {
            id: "received",
            title: t("finance.received", "Received"),
            at: formatDisplayDateTime(bill.receivedAt, locale),
          },
        ]
      : []),
    ...bill.payments.map((payment) => ({
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
          <Link href="/dashboard/finance/vendor-bills">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("finance.backToBills", "Back to bills")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <FinanceNavLinks />

      <RecordVendorPaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        billId={bill.id}
        billNumber={bill.billNumber}
        balanceDue={bill.balanceDue}
        onSuccess={() => {
          setActionSuccess(t("form.paymentRecorded"));
        }}
      />

      <FinancialWorkspace
        entityType="vendor_bill"
        entityId={bill.id}
        header={
          <EntityHeader
            breadcrumbs={[
              {
                label: t("nav.vendorBills", "Vendor bills"),
                href: "/dashboard/finance/vendor-bills",
              },
              { label: bill.billNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={<span className="ew-ltr-isolate">{bill.billNumber}</span>}
                  subtitle={`${bill.vendor.name} · Due ${formatDisplayDate(bill.dueDate, locale)}`}
                  trailing={
                    <EntityStatus
                      label={statusLabel(bill.status)}
                      variant={transactionStatusVariant(bill.status)}
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
              { id: "subtotal", label: t("transaction.subtotal", "Subtotal"), value: bill.subtotal },
              { id: "tax", label: t("transaction.tax", "Tax"), value: bill.taxAmount },
              { id: "total", label: t("transaction.total", "Total"), value: bill.totalAmount },
              { id: "paid", label: t("finance.paid", "Paid"), value: bill.amountPaid },
              { id: "balance", label: t("finance.balanceDue", "Balance due"), value: bill.balanceDue },
              {
                id: "due",
                label: t("finance.dueDate", "Due date"),
                value: formatDisplayDate(bill.dueDate, locale),
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
                        href={`/dashboard/procurement/vendors/${bill.vendor.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {bill.vendor.name}
                      </Link>
                    ),
                  },
                  {
                    id: "bill-date",
                    label: t("finance.billDate", "Bill date"),
                    value: formatDisplayDate(bill.billDate, locale),
                    mono: true,
                  },
                  {
                    id: "due-date",
                    label: t("finance.dueDate", "Due date"),
                    value: formatDisplayDate(bill.dueDate, locale),
                    mono: true,
                  },
                  {
                    id: "purchase-order",
                    label: t("transaction.purchaseOrder", "Purchase order"),
                    value: bill.purchaseOrder ? (
                      <Link
                        href={`/dashboard/procurement/purchase-orders/${bill.purchaseOrder.id}`}
                        className="ew-ltr-isolate text-[var(--accent)] hover:underline"
                      >
                        {bill.purchaseOrder.poNumber}
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
              description={t("finance.billLinesDesc", "Products and charges on this bill")}
              columns={lineColumns}
              data={bill.lines}
              totals={
                <div className="flex flex-wrap justify-end gap-4 tabular-nums">
                  <span>
                    {t("transaction.subtotal", "Subtotal")}:{" "}
                    <strong className="ew-ltr-isolate">{bill.subtotal}</strong>
                  </span>
                  <span>
                    {t("transaction.tax", "Tax")}:{" "}
                    <strong className="ew-ltr-isolate">{bill.taxAmount}</strong>
                  </span>
                  <span>
                    {t("transaction.total", "Total")}:{" "}
                    <strong className="ew-ltr-isolate">{bill.totalAmount}</strong>
                  </span>
                </div>
              }
            />

            <EntityTableSection
              id="payments"
              title={t("finance.payments", "Payments")}
              description={t("finance.billPaymentsDesc", "Payments applied to this bill")}
            >
              {bill.payments.length === 0 ? (
                <div className="p-4">
                  <EntityEmptyState
                    variant="empty"
                    density="compact"
                    title={t("finance.noPayments", "No payments recorded")}
                  />
                </div>
              ) : (
                <DataTable columns={vendorPaymentColumns} data={bill.payments} pageSize={10} />
              )}
            </EntityTableSection>

            <EntityNotes notes={bill.notes ? [{ id: "notes", body: bill.notes }] : []} />

            <EntityLinkedAttachments
              module="FINANCE"
              entityType="vendor_bill"
              entityId={bill.id}
            />

            <EntityTimeline events={timelineEvents} />

            <EntityAudit
              meta={{
                id: bill.id,
                createdAt: bill.createdAt
                  ? formatDisplayDateTime(bill.createdAt, locale)
                  : formatDisplayDate(bill.billDate, locale),
                updatedAt: bill.updatedAt
                  ? formatDisplayDateTime(bill.updatedAt, locale)
                  : undefined,
                createdBy: bill.createdBy?.name,
              }}
            />
          </>
        }
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={statusLabel(bill.status)}
              steps={
                bill.status === "VOID"
                  ? [{ id: "VOID", label: "Void", active: true }]
                  : buildLinearWorkflowSteps(BILL_WORKFLOW, workflowCurrent)
              }
              defaultOpen
            />
            {bill.createdBy ? (
              <EntityOwner
                name={bill.createdBy.name}
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

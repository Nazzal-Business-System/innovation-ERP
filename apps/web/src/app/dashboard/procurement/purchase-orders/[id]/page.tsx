"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowLeft, Ban, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { ModuleLayout } from "@/components/layout/module-layout";
import { ProcurementNavLinks } from "@/components/procurement/procurement-gate";
import { ProcurementPageSkeleton } from "@/components/procurement/procurement-page-skeleton";
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
  EntityTitle,
  EntityWorkflow,
  TransactionalLineTable,
  TransactionWorkspace,
} from "@/components/entity-workspace";
import { purchaseOrderLineColumns } from "@/components/entity-workspace/transactional-line-columns";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import { formatDisplayDate } from "@/lib/date";
import {
  useProcurementPurchaseOrder,
  useUpdatePurchaseOrderStatus,
} from "@/lib/hooks/use-procurement";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { INVENTORY_PERMISSIONS, PROCUREMENT_PERMISSIONS } from "@ierp/shared";

const PO_WORKFLOW = [
  { id: "DRAFT", label: "Draft" },
  { id: "SENT", label: "Sent" },
  { id: "APPROVED", label: "Approved" },
  { id: "RECEIVED", label: "Received" },
];

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(PROCUREMENT_PERMISSIONS.WRITE);
  const canLinkProducts = has(INVENTORY_PERMISSIONS.READ);
  const { data: po, loading, error, refetch } = useProcurementPurchaseOrder(id);
  const statusMutation = useUpdatePurchaseOrderStatus();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const lineColumns = useMemo(
    () => purchaseOrderLineColumns(canLinkProducts),
    [canLinkProducts]
  );

  async function handleStatus(status: "SENT" | "APPROVED" | "CANCELLED") {
    if (statusMutation.isPending) return;
    setPendingAction(status);
    setActionError(null);
    setActionSuccess(null);
    try {
      await statusMutation.mutateAsync({ id, status });
      setActionSuccess(
        status === "SENT"
          ? t("action.poSent")
          : status === "APPROVED"
            ? t("action.poApproved")
            : t("action.poCancelled", "Purchase order cancelled")
      );
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return (
      <ModuleLayout>
        <ProcurementPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !po) {
    return (
      <ModuleLayout maxWidth="lg">
        <TransactionWorkspace
          entityType="purchase_order"
          entityId={id}
          error={error ?? t("transaction.poNotFound", "Purchase order not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const canSend = canWrite && po.status === "DRAFT";
  const canApprove = canWrite && (po.status === "DRAFT" || po.status === "SENT");
  const canCancel =
    canWrite && !["CANCELLED", "RECEIVED"].includes(po.status);
  const canCreateReceipt =
    canWrite && ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"].includes(po.status);
  const canReceiveLink = ["SENT", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"].includes(
    po.status
  );

  const workflowCurrent =
    po.status === "CANCELLED"
      ? "DRAFT"
      : po.status === "PARTIALLY_RECEIVED" || po.status === "RECEIVED"
        ? "RECEIVED"
        : po.status === "APPROVED"
          ? "APPROVED"
          : po.status === "SENT"
            ? "SENT"
            : "DRAFT";

  const headerActions: EntityAction[] = [
    ...(canApprove
      ? [
          {
            id: "approve",
            label: t("action.approvePo"),
            icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
            kind: "primary" as const,
            capability: "approve",
            pending: pendingAction === "APPROVED",
            confirm: "soft" as const,
            confirmTitle: t("action.approvePo"),
            confirmDescription: t("action.approvePoConfirm"),
            onSelect: () => void handleStatus("APPROVED"),
          },
        ]
      : []),
    ...(canSend
      ? [
          {
            id: "send",
            label: t("action.sendPo"),
            icon: <Send className="h-3.5 w-3.5" aria-hidden />,
            kind: canApprove ? ("secondary" as const) : ("primary" as const),
            capability: "transition",
            pending: pendingAction === "SENT",
            confirm: "soft" as const,
            confirmTitle: t("action.sendPo"),
            confirmDescription: t("action.sendPoConfirm"),
            onSelect: () => void handleStatus("SENT"),
          },
        ]
      : []),
    ...(canCreateReceipt
      ? [
          {
            id: "create-receipt",
            label: t("wizard.createGoodsReceipt"),
            icon: <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />,
            kind: "secondary" as const,
            capability: "createRelated",
            onSelect: () => {
              router.push(`/dashboard/operations/goods-receipts/new?poId=${po.id}`);
            },
          },
        ]
      : []),
    ...(canCancel
      ? [
          {
            id: "cancel",
            label: t("action.cancelOrder", "Cancel order"),
            icon: <Ban className="h-3.5 w-3.5" aria-hidden />,
            kind: "destructive" as const,
            capability: "transition",
            pending: pendingAction === "CANCELLED",
            confirm: "hard" as const,
            confirmTitle: t("action.cancelOrder", "Cancel order"),
            confirmDescription: t(
              "action.cancelPoConfirm",
              "Cancel this purchase order? This cannot be undone from the workspace."
            ),
            onSelect: () => void handleStatus("CANCELLED"),
          },
        ]
      : []),
  ];

  const relationItems = [
    {
      id: "vendor",
      label: po.vendor.name,
      description: t("transaction.vendor", "Vendor"),
      meta: po.vendor.code,
      href: `/dashboard/procurement/vendors/${po.vendor.id}`,
    },
    {
      id: "warehouse",
      label: po.warehouse.name,
      description: t("transaction.warehouse", "Warehouse"),
      meta: po.warehouse.code,
      href: `/dashboard/inventory/warehouses/${po.warehouse.id}`,
    },
    ...(canReceiveLink
      ? [
          {
            id: "receipts",
            label: t("action.viewGoodsReceipts"),
            description: po.poNumber,
            href: `/dashboard/operations/goods-receipts?search=${encodeURIComponent(po.poNumber)}`,
          },
        ]
      : []),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/procurement/purchase-orders">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("transaction.backToPurchaseOrders", "Back to purchase orders")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <ProcurementNavLinks />

      <TransactionWorkspace
        entityType="purchase_order"
        entityId={po.id}
        header={
          <EntityHeader
            breadcrumbs={[
              {
                label: t("nav.purchaseOrders", "Purchase orders"),
                href: "/dashboard/procurement/purchase-orders",
              },
              { label: po.poNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={<span className="ew-ltr-isolate">{po.poNumber}</span>}
                  subtitle={`${po.vendor.name} · ${po.warehouse.name}`}
                  trailing={
                    <EntityStatus
                      label={statusLabel(po.status)}
                      variant={transactionStatusVariant(po.status)}
                    />
                  }
                />
              </div>
              <EntityActionBar
                actions={headerActions}
                capabilities={
                  canWrite
                    ? ["approve", "transition", "createRelated"]
                    : ([] as string[])
                }
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              { id: "subtotal", label: t("transaction.subtotal", "Subtotal"), value: po.subtotal },
              { id: "tax", label: t("transaction.tax", "Tax"), value: po.taxAmount },
              { id: "total", label: t("transaction.total", "Total"), value: po.totalAmount },
              {
                id: "lines",
                label: t("transaction.lineItems", "Line items"),
                value: String(po.lines.length),
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
                        href={`/dashboard/procurement/vendors/${po.vendor.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {po.vendor.name}
                      </Link>
                    ),
                  },
                  {
                    id: "warehouse",
                    label: t("transaction.warehouse", "Warehouse"),
                    value: (
                      <Link
                        href={`/dashboard/inventory/warehouses/${po.warehouse.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {po.warehouse.name}
                      </Link>
                    ),
                  },
                  {
                    id: "order-date",
                    label: t("transaction.orderDate", "Order date"),
                    value: formatDisplayDate(po.orderDate, locale),
                    mono: true,
                  },
                  {
                    id: "expected",
                    label: t("transaction.expectedReceipt", "Expected receipt"),
                    value: formatDisplayDate(po.expectedDate, locale),
                    mono: true,
                  },
                ]}
              />
            </EntitySection>

            <TransactionalLineTable
              title={t("transaction.lineItems", "Line items")}
              description={t("transaction.poLinesDesc", "Products ordered on this purchase order")}
              columns={lineColumns}
              data={po.lines}
              totals={
                <div className="flex flex-wrap justify-end gap-4 tabular-nums">
                  <span>
                    {t("transaction.subtotal", "Subtotal")}:{" "}
                    <strong className="ew-ltr-isolate">{po.subtotal}</strong>
                  </span>
                  <span>
                    {t("transaction.tax", "Tax")}:{" "}
                    <strong className="ew-ltr-isolate">{po.taxAmount}</strong>
                  </span>
                  <span>
                    {t("transaction.total", "Total")}:{" "}
                    <strong className="ew-ltr-isolate">{po.totalAmount}</strong>
                  </span>
                </div>
              }
            />

            <EntityNotes notes={po.notes ? [{ id: "notes", body: po.notes }] : []} />

            <EntityLinkedAttachments
              module="PROCUREMENT"
              entityType="purchase_order"
              entityId={po.id}
            />

            <EntityAudit
              meta={{
                id: po.id,
                createdAt: formatDisplayDate(po.orderDate, locale),
                createdBy: po.createdBy?.name,
              }}
            />
          </>
        }
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={statusLabel(po.status)}
              steps={
                po.status === "CANCELLED"
                  ? [{ id: "CANCELLED", label: "Cancelled", active: true }]
                  : buildLinearWorkflowSteps(PO_WORKFLOW, workflowCurrent)
              }
              defaultOpen
            />
            {po.createdBy ? (
              <EntityOwner name={po.createdBy.name} role={t("transaction.createdBy", "Created by")} />
            ) : null}
            <EntityRelations items={relationItems} />
            {po.status === "PARTIALLY_RECEIVED" ? (
              <EntitySection id="progress" title={t("transaction.fulfillment", "Fulfillment")}>
                <p className="text-sm text-[var(--muted)]">
                  {t(
                    "transaction.partiallyReceivedHint",
                    "This purchase order is partially received."
                  )}
                </p>
              </EntitySection>
            ) : null}
            {!canSend && !canApprove && !canCreateReceipt ? (
              <EntitySection id="status-note" title={t("action.currentStatus")}>
                <EntityEmptyState
                  variant="empty"
                  density="compact"
                  title={statusLabel(po.status)}
                />
              </EntitySection>
            ) : null}
          </>
        }
      />
    </ModuleLayout>
  );
}

"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { ModuleLayout } from "@/components/layout/module-layout";
import { OperationsNavLinks } from "@/components/operations/operations-gate";
import { OperationsDetailSkeleton } from "@/components/operations/operations-page-skeleton";
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
import { goodsReceiptLineColumns } from "@/components/entity-workspace/transactional-line-columns";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import { formatDisplayDate } from "@/lib/date";
import { useGoodsReceipt, useReceiveGoodsReceipt } from "@/lib/hooks/use-operations";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import {
  INVENTORY_PERMISSIONS,
  OPERATIONS_PERMISSIONS,
  PROCUREMENT_PERMISSIONS,
} from "@ierp/shared";

const GR_WORKFLOW = [
  { id: "DRAFT", label: "Draft" },
  { id: "RECEIVED", label: "Received" },
];

export default function GoodsReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(OPERATIONS_PERMISSIONS.WRITE) || has(PROCUREMENT_PERMISSIONS.WRITE);
  const canLinkProducts = has(INVENTORY_PERMISSIONS.READ);
  const { data: receipt, loading, error, refetch } = useGoodsReceipt(id);
  const receiveMutation = useReceiveGoodsReceipt();
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const lineColumns = useMemo(
    () => goodsReceiptLineColumns(canLinkProducts),
    [canLinkProducts]
  );

  async function handleReceive() {
    if (receiveMutation.isPending) return;
    setPending(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await receiveMutation.mutateAsync({ id });
      setActionSuccess(t("action.grReceived"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <ModuleLayout>
        <OperationsDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !receipt) {
    return (
      <ModuleLayout maxWidth="lg">
        <TransactionWorkspace
          entityType="goods_receipt"
          entityId={id}
          error={error ?? t("transaction.grNotFound", "Goods receipt not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const canReceive = canWrite && receipt.canReceive;
  const expectedQty = receipt.lines.reduce((sum, l) => sum + l.orderedQuantity, 0);
  const receivedQty = receipt.lines.reduce((sum, l) => sum + l.receivedQuantity, 0);
  const varianceQty = receivedQty - expectedQty;

  const headerActions: EntityAction[] = canReceive
    ? [
        {
          id: "receive",
          label: t("action.receiveIntoStock"),
          icon: <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />,
          kind: "primary",
          capability: "transition",
          pending,
          confirm: "soft",
          confirmTitle: t("action.receiveIntoStock"),
          confirmDescription: t("action.receiveGrConfirm"),
          onSelect: () => void handleReceive(),
        },
      ]
    : [];

  const relationItems = [
    {
      id: "purchase-order",
      label: receipt.purchaseOrder.poNumber,
      description: t("transaction.purchaseOrder", "Purchase order"),
      meta: statusLabel(receipt.purchaseOrder.status),
      href: `/dashboard/procurement/purchase-orders/${receipt.purchaseOrder.id}`,
    },
    {
      id: "warehouse",
      label: receipt.warehouse.name,
      description: t("transaction.warehouse", "Warehouse"),
      meta: receipt.warehouse.code,
      href: `/dashboard/inventory/warehouses/${receipt.warehouse.id}`,
    },
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/operations/goods-receipts">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("transaction.backToGoodsReceipts", "Back to goods receipts")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <OperationsNavLinks />

      <TransactionWorkspace
        entityType="goods_receipt"
        entityId={receipt.id}
        header={
          <EntityHeader
            breadcrumbs={[
              {
                label: t("nav.goodsReceipts", "Goods receipts"),
                href: "/dashboard/operations/goods-receipts",
              },
              { label: receipt.receiptNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={<span className="ew-ltr-isolate">{receipt.receiptNumber}</span>}
                  subtitle={`${receipt.purchaseOrder.poNumber} · ${receipt.warehouse.name}`}
                  trailing={
                    <EntityStatus
                      label={statusLabel(receipt.status)}
                      variant={transactionStatusVariant(receipt.status)}
                    />
                  }
                />
              </div>
              <EntityActionBar
                actions={headerActions}
                capabilities={canWrite ? ["transition"] : []}
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "expected",
                label: t("transaction.expectedQty", "Expected quantity"),
                value: String(expectedQty),
              },
              {
                id: "received",
                label: t("transaction.receivedQty", "Received quantity"),
                value: String(receivedQty),
              },
              {
                id: "variance",
                label: t("transaction.variance", "Variance"),
                value: varianceQty > 0 ? `+${varianceQty}` : String(varianceQty),
              },
              {
                id: "lines",
                label: t("transaction.lineItems", "Line items"),
                value: String(receipt.lines.length),
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
                    id: "po",
                    label: t("transaction.purchaseOrder", "Purchase order"),
                    value: (
                      <Link
                        href={`/dashboard/procurement/purchase-orders/${receipt.purchaseOrder.id}`}
                        className="ew-ltr-isolate text-[var(--accent)] hover:underline"
                      >
                        {receipt.purchaseOrder.poNumber}
                      </Link>
                    ),
                  },
                  {
                    id: "warehouse",
                    label: t("transaction.warehouse", "Warehouse"),
                    value: (
                      <Link
                        href={`/dashboard/inventory/warehouses/${receipt.warehouse.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {receipt.warehouse.name}
                      </Link>
                    ),
                  },
                  {
                    id: "po-status",
                    label: t("transaction.poStatus", "PO status"),
                    value: statusLabel(receipt.purchaseOrder.status),
                  },
                  {
                    id: "received-date",
                    label: t("transaction.receivedDate", "Received date"),
                    value: receipt.receivedDate
                      ? formatDisplayDate(receipt.receivedDate, locale)
                      : t("transaction.pending", "Pending"),
                    mono: true,
                  },
                ]}
              />
            </EntitySection>

            <TransactionalLineTable
              title={t("transaction.lineItems", "Line items")}
              description={t(
                "transaction.grLinesDesc",
                "Expected, received, and rejected quantities"
              )}
              columns={lineColumns}
              data={receipt.lines}
            />

            <EntitySection
              id="inventory-impact"
              title={t("transaction.inventoryImpact", "Inventory impact")}
            >
              {receipt.stockImpact.length === 0 ? (
                <EntityEmptyState
                  variant="empty"
                  density="compact"
                  title={t("transaction.noStockImpact", "No stock impact yet")}
                />
              ) : (
                <ul className="space-y-2">
                  {receipt.stockImpact.map((impact) => (
                    <li
                      key={impact.productId}
                      className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{impact.productName}</p>
                        <p className="ew-ltr-isolate font-mono text-xs text-[var(--muted)]">
                          {impact.sku}
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="font-semibold tabular-nums text-[var(--success)]">
                          +{impact.quantity}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {impact.movementType ?? t("transaction.pendingReceipt", "Pending RECEIPT")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </EntitySection>

            <EntityNotes notes={receipt.notes ? [{ id: "notes", body: receipt.notes }] : []} />

            <EntityLinkedAttachments
              module="OPERATIONS"
              entityType="goods_receipt"
              entityId={receipt.id}
            />

            <EntityAudit
              meta={{
                id: receipt.id,
                createdAt: receipt.receivedDate
                  ? formatDisplayDate(receipt.receivedDate, locale)
                  : undefined,
                updatedBy: receipt.receivedBy?.name,
              }}
            />
          </>
        }
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={statusLabel(receipt.status)}
              steps={
                receipt.status === "CANCELLED"
                  ? [{ id: "CANCELLED", label: "Cancelled", active: true }]
                  : buildLinearWorkflowSteps(GR_WORKFLOW, receipt.status)
              }
              defaultOpen
            />
            {receipt.receivedBy ? (
              <EntityOwner
                name={receipt.receivedBy.name}
                role={t("transaction.receivedBy", "Received by")}
              />
            ) : null}
            <EntityRelations items={relationItems} />
          </>
        }
      />
    </ModuleLayout>
  );
}

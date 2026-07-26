"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ArrowUpFromLine } from "lucide-react";
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
import { deliveryLineColumns } from "@/components/entity-workspace/transactional-line-columns";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import { formatDisplayDate } from "@/lib/date";
import { useDeliverDelivery, useDelivery } from "@/lib/hooks/use-operations";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { INVENTORY_PERMISSIONS, OPERATIONS_PERMISSIONS, SALES_PERMISSIONS } from "@ierp/shared";

const DL_WORKFLOW = [
  { id: "DRAFT", label: "Draft" },
  { id: "PICKED", label: "Picked" },
  { id: "DELIVERED", label: "Delivered" },
];

export default function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(OPERATIONS_PERMISSIONS.WRITE) || has(SALES_PERMISSIONS.WRITE);
  const canLinkProducts = has(INVENTORY_PERMISSIONS.READ);
  const { data: delivery, loading, error, refetch } = useDelivery(id);
  const deliverMutation = useDeliverDelivery();
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const lineColumns = useMemo(
    () => deliveryLineColumns(canLinkProducts),
    [canLinkProducts]
  );

  async function handleDeliver() {
    if (deliverMutation.isPending) return;
    setPending(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await deliverMutation.mutateAsync({ id });
      setActionSuccess(t("action.deliveryConfirmed"));
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

  if (error || !delivery) {
    return (
      <ModuleLayout maxWidth="lg">
        <TransactionWorkspace
          entityType="delivery"
          entityId={id}
          error={error ?? t("transaction.deliveryNotFound", "Delivery not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const hasStockWarning = delivery.stockWarnings.length > 0;
  const canDeliver = canWrite && delivery.canDeliver;
  const orderedQty = delivery.lines.reduce((sum, l) => sum + l.orderedQuantity, 0);
  const deliveredQty = delivery.lines.reduce((sum, l) => sum + l.deliveredQuantity, 0);
  const returnedQty = delivery.lines.reduce((sum, l) => sum + l.returnedQuantity, 0);

  const workflowCurrent =
    delivery.status === "CANCELLED"
      ? "DRAFT"
      : delivery.status === "DELIVERED"
        ? "DELIVERED"
        : delivery.status === "PICKED"
          ? "PICKED"
          : "DRAFT";

  const headerActions: EntityAction[] = canDeliver
    ? [
        {
          id: "confirm-delivery",
          label: t("action.confirmDelivery"),
          icon: <ArrowUpFromLine className="h-3.5 w-3.5" aria-hidden />,
          kind: "primary",
          capability: "transition",
          pending,
          disabled: hasStockWarning,
          disabledReason: hasStockWarning ? t("action.insufficientStock") : undefined,
          confirm: "soft",
          confirmTitle: t("action.confirmDelivery"),
          confirmDescription: t("action.confirmDeliveryConfirm"),
          onSelect: () => void handleDeliver(),
        },
      ]
    : [];

  const relationItems = [
    {
      id: "sales-order",
      label: delivery.salesOrder.soNumber,
      description: t("transaction.salesOrder", "Sales order"),
      meta: statusLabel(delivery.salesOrder.status),
      href: `/dashboard/sales/orders/${delivery.salesOrder.id}`,
    },
    {
      id: "customer",
      label: delivery.customer.name,
      description: t("transaction.customer", "Customer"),
      meta: delivery.customer.code,
      href: `/dashboard/sales/customers/${delivery.customer.id}`,
    },
    {
      id: "warehouse",
      label: delivery.warehouse.name,
      description: t("transaction.warehouse", "Warehouse"),
      meta: delivery.warehouse.code,
      href: `/dashboard/inventory/warehouses/${delivery.warehouse.id}`,
    },
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/operations/deliveries">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("transaction.backToDeliveries", "Back to deliveries")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <OperationsNavLinks />

      <TransactionWorkspace
        entityType="delivery"
        entityId={delivery.id}
        header={
          <EntityHeader
            breadcrumbs={[
              {
                label: t("nav.deliveries", "Deliveries"),
                href: "/dashboard/operations/deliveries",
              },
              { label: delivery.deliveryNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={<span className="ew-ltr-isolate">{delivery.deliveryNumber}</span>}
                  subtitle={`${delivery.salesOrder.soNumber} · ${delivery.customer.name}`}
                  trailing={
                    <EntityStatus
                      label={statusLabel(delivery.status)}
                      variant={transactionStatusVariant(delivery.status)}
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
                id: "ordered",
                label: t("transaction.orderedQty", "Ordered quantity"),
                value: String(orderedQty),
              },
              {
                id: "delivered",
                label: t("transaction.deliveredQty", "Delivered quantity"),
                value: String(deliveredQty),
              },
              {
                id: "returned",
                label: t("transaction.returnedQty", "Returned quantity"),
                value: String(returnedQty),
              },
              {
                id: "lines",
                label: t("transaction.lineItems", "Line items"),
                value: String(delivery.lines.length),
              },
            ]}
          />
        }
        main={
          <>
            {hasStockWarning ? (
              <EntitySection id="stock-warnings" title={t("action.insufficientStock")} defaultOpen>
                <div className="space-y-2">
                  {delivery.stockWarnings.map((warning) => (
                    <div
                      key={warning}
                      className="flex items-start gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)] px-3 py-2 text-sm text-[var(--warning)]"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              </EntitySection>
            ) : null}

            <EntitySection id="overview" title={t("entityWorkspace.summary")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  {
                    id: "so",
                    label: t("transaction.salesOrder", "Sales order"),
                    value: (
                      <Link
                        href={`/dashboard/sales/orders/${delivery.salesOrder.id}`}
                        className="ew-ltr-isolate text-[var(--accent)] hover:underline"
                      >
                        {delivery.salesOrder.soNumber}
                      </Link>
                    ),
                  },
                  {
                    id: "customer",
                    label: t("transaction.customer", "Customer"),
                    value: (
                      <Link
                        href={`/dashboard/sales/customers/${delivery.customer.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {delivery.customer.name}
                      </Link>
                    ),
                  },
                  {
                    id: "warehouse",
                    label: t("transaction.warehouse", "Warehouse"),
                    value: (
                      <Link
                        href={`/dashboard/inventory/warehouses/${delivery.warehouse.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {delivery.warehouse.name}
                      </Link>
                    ),
                  },
                  {
                    id: "delivery-date",
                    label: t("transaction.deliveryDate", "Delivery date"),
                    value: delivery.deliveryDate
                      ? formatDisplayDate(delivery.deliveryDate, locale)
                      : t("transaction.pending", "Pending"),
                    mono: true,
                  },
                ]}
              />
            </EntitySection>

            <TransactionalLineTable
              title={t("transaction.lineItems", "Line items")}
              description={t(
                "transaction.deliveryLinesDesc",
                "Ordered, delivered, and returned quantities"
              )}
              columns={lineColumns}
              data={delivery.lines}
            />

            <EntitySection
              id="inventory-impact"
              title={t("transaction.inventoryImpact", "Inventory impact")}
            >
              {delivery.stockImpact.length === 0 ? (
                <EntityEmptyState
                  variant="empty"
                  density="compact"
                  title={t("transaction.noStockImpact", "No stock impact yet")}
                />
              ) : (
                <ul className="space-y-2">
                  {delivery.stockImpact.map((impact) => (
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
                        <p className="font-semibold tabular-nums text-[var(--destructive)]">
                          −{impact.quantity}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {impact.movementType ?? t("transaction.pendingIssue", "Pending ISSUE")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </EntitySection>

            <EntityNotes notes={delivery.notes ? [{ id: "notes", body: delivery.notes }] : []} />

            <EntityLinkedAttachments
              module="OPERATIONS"
              entityType="delivery"
              entityId={delivery.id}
            />

            <EntityAudit
              meta={{
                id: delivery.id,
                createdAt: delivery.deliveryDate
                  ? formatDisplayDate(delivery.deliveryDate, locale)
                  : undefined,
                updatedBy: delivery.deliveredBy?.name,
              }}
            />
          </>
        }
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={statusLabel(delivery.status)}
              steps={
                delivery.status === "CANCELLED"
                  ? [{ id: "CANCELLED", label: "Cancelled", active: true }]
                  : buildLinearWorkflowSteps(DL_WORKFLOW, workflowCurrent)
              }
              defaultOpen
            />
            {delivery.deliveredBy ? (
              <EntityOwner
                name={delivery.deliveredBy.name}
                role={t("transaction.deliveredBy", "Delivered by")}
              />
            ) : null}
            <EntityRelations items={relationItems} />
          </>
        }
      />
    </ModuleLayout>
  );
}

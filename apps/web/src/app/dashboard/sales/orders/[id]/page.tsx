"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpFromLine, Ban, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { ModuleLayout } from "@/components/layout/module-layout";
import { SalesNavLinks } from "@/components/sales/sales-gate";
import { SalesPageSkeleton } from "@/components/sales/sales-page-skeleton";
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
import {
  salesOrderLineColumns,
} from "@/components/entity-workspace/transactional-line-columns";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import { formatDisplayDate } from "@/lib/date";
import { useSalesOrder, useUpdateSalesOrderStatus } from "@/lib/hooks/use-sales";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { INVENTORY_PERMISSIONS, SALES_PERMISSIONS } from "@ierp/shared";

const SO_WORKFLOW = [
  { id: "DRAFT", label: "Draft" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "DELIVERED", label: "Delivered" },
];

export default function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(SALES_PERMISSIONS.WRITE);
  const canLinkProducts = has(INVENTORY_PERMISSIONS.READ);
  const { data: order, loading, error, refetch } = useSalesOrder(id);
  const statusMutation = useUpdateSalesOrderStatus();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const lineColumns = useMemo(
    () => salesOrderLineColumns(canLinkProducts),
    [canLinkProducts]
  );

  async function handleStatus(status: "CONFIRMED" | "CANCELLED") {
    if (statusMutation.isPending) return;
    setPendingAction(status);
    setActionError(null);
    setActionSuccess(null);
    try {
      await statusMutation.mutateAsync({ id, status });
      setActionSuccess(
        status === "CONFIRMED" ? t("action.soConfirmed") : t("action.soCancelled", "Sales order cancelled")
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
        <SalesPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !order) {
    return (
      <ModuleLayout maxWidth="lg">
        <TransactionWorkspace
          entityType="sales_order"
          entityId={id}
          error={error ?? t("transaction.soNotFound", "Sales order not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const canConfirm = canWrite && order.status === "DRAFT";
  const canCancel =
    canWrite && !["CANCELLED", "INVOICED", "DELIVERED"].includes(order.status);
  const canCreateDelivery = canWrite && !["DRAFT", "CANCELLED"].includes(order.status);
  const canViewDeliveries = !["DRAFT", "CANCELLED"].includes(order.status);

  const workflowCurrent =
    order.status === "CANCELLED"
      ? "DRAFT"
      : order.status === "INVOICED" || order.status === "DELIVERED"
        ? "DELIVERED"
        : order.status === "DRAFT"
          ? "DRAFT"
          : "CONFIRMED";

  const headerActions: EntityAction[] = [
    ...(canConfirm
      ? [
          {
            id: "confirm",
            label: t("action.confirmSo"),
            icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
            kind: "primary" as const,
            capability: "transition",
            pending: pendingAction === "CONFIRMED",
            confirm: "soft" as const,
            confirmTitle: t("action.confirmSo"),
            confirmDescription: t("action.confirmSoConfirm"),
            onSelect: () => void handleStatus("CONFIRMED"),
          },
        ]
      : []),
    ...(canCreateDelivery
      ? [
          {
            id: "create-delivery",
            label: t("wizard.createDelivery"),
            icon: <ArrowUpFromLine className="h-3.5 w-3.5" aria-hidden />,
            kind: canConfirm ? ("secondary" as const) : ("primary" as const),
            capability: "createRelated",
            onSelect: () => {
              router.push(`/dashboard/operations/deliveries/new?soId=${order.id}`);
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
              "action.cancelSoConfirm",
              "Cancel this sales order? Reserved stock will be released when applicable."
            ),
            onSelect: () => void handleStatus("CANCELLED"),
          },
        ]
      : []),
  ];

  const relationItems = [
    {
      id: "customer",
      label: order.customer.name,
      description: t("transaction.customer", "Customer"),
      meta: order.customer.code,
      href: `/dashboard/sales/customers/${order.customer.id}`,
    },
    {
      id: "warehouse",
      label: order.warehouse.name,
      description: t("transaction.warehouse", "Warehouse"),
      meta: order.warehouse.code,
      href: `/dashboard/inventory/warehouses/${order.warehouse.id}`,
    },
    ...(canViewDeliveries
      ? [
          {
            id: "deliveries",
            label: t("action.viewDeliveries"),
            description: order.soNumber,
            href: `/dashboard/operations/deliveries?search=${encodeURIComponent(order.soNumber)}`,
          },
        ]
      : []),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/sales/orders">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("transaction.backToSalesOrders", "Back to sales orders")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <SalesNavLinks />

      <TransactionWorkspace
        entityType="sales_order"
        entityId={order.id}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("nav.salesOrders", "Sales orders"), href: "/dashboard/sales/orders" },
              { label: order.soNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={<span className="ew-ltr-isolate">{order.soNumber}</span>}
                  subtitle={`${order.customer.name} · ${order.warehouse.name}`}
                  trailing={
                    <EntityStatus
                      label={statusLabel(order.status)}
                      variant={transactionStatusVariant(order.status)}
                    />
                  }
                />
              </div>
              <EntityActionBar
                actions={headerActions}
                capabilities={
                  canWrite ? ["transition", "createRelated"] : ([] as string[])
                }
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              { id: "subtotal", label: t("transaction.subtotal", "Subtotal"), value: order.subtotal },
              { id: "tax", label: t("transaction.tax", "Tax"), value: order.taxAmount },
              { id: "total", label: t("transaction.total", "Total"), value: order.totalAmount },
              {
                id: "lines",
                label: t("transaction.lineItems", "Line items"),
                value: String(order.lines.length),
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
                        href={`/dashboard/sales/customers/${order.customer.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {order.customer.name}
                      </Link>
                    ),
                  },
                  {
                    id: "warehouse",
                    label: t("transaction.warehouse", "Warehouse"),
                    value: (
                      <Link
                        href={`/dashboard/inventory/warehouses/${order.warehouse.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {order.warehouse.name}
                      </Link>
                    ),
                  },
                  {
                    id: "order-date",
                    label: t("transaction.orderDate", "Order date"),
                    value: formatDisplayDate(order.orderDate, locale),
                    mono: true,
                  },
                  {
                    id: "expected",
                    label: t("transaction.expectedDelivery", "Expected delivery"),
                    value: formatDisplayDate(order.expectedDeliveryDate, locale),
                    mono: true,
                  },
                ]}
              />
            </EntitySection>

            <TransactionalLineTable
              title={t("transaction.lineItems", "Line items")}
              description={t("transaction.soLinesDesc", "Products on this sales order")}
              columns={lineColumns}
              data={order.lines}
              totals={
                <div className="flex flex-wrap justify-end gap-4 tabular-nums">
                  <span>
                    {t("transaction.subtotal", "Subtotal")}:{" "}
                    <strong className="ew-ltr-isolate">{order.subtotal}</strong>
                  </span>
                  <span>
                    {t("transaction.tax", "Tax")}:{" "}
                    <strong className="ew-ltr-isolate">{order.taxAmount}</strong>
                  </span>
                  <span>
                    {t("transaction.total", "Total")}:{" "}
                    <strong className="ew-ltr-isolate">{order.totalAmount}</strong>
                  </span>
                </div>
              }
            />

            <EntityNotes
              notes={
                order.notes
                  ? [{ id: "notes", body: order.notes }]
                  : []
              }
            />

            <EntityLinkedAttachments
              module="SALES"
              entityType="sales_order"
              entityId={order.id}
            />

            <EntityAudit
              meta={{
                id: order.id,
                createdAt: formatDisplayDate(order.orderDate, locale),
                createdBy: order.createdBy?.name,
              }}
            />
          </>
        }
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={statusLabel(order.status)}
              steps={
                order.status === "CANCELLED"
                  ? [{ id: "CANCELLED", label: "Cancelled", active: true }]
                  : buildLinearWorkflowSteps(SO_WORKFLOW, workflowCurrent)
              }
              defaultOpen
            />
            {order.createdBy ? (
              <EntityOwner name={order.createdBy.name} role={t("transaction.createdBy", "Created by")} />
            ) : null}
            <EntityRelations items={relationItems} />
            {!canConfirm && !canCreateDelivery && !canCancel ? (
              <EntitySection id="warnings" title={t("transaction.fulfillment", "Fulfillment")}>
                <EntityEmptyState
                  variant="empty"
                  density="compact"
                  title={t("action.currentStatus") + `: ${statusLabel(order.status)}`}
                />
              </EntitySection>
            ) : null}
          </>
        }
      />
    </ModuleLayout>
  );
}

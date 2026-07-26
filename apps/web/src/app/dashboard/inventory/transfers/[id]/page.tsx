"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { ModuleLayout } from "@/components/layout/module-layout";
import { InventoryNavLinks } from "@/components/inventory/inventory-gate";
import { InventoryPageSkeleton } from "@/components/inventory/inventory-page-skeleton";
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
import { transferLineColumns } from "@/components/entity-workspace/transactional-line-columns";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import { formatDisplayDate } from "@/lib/date";
import { useCompleteTransfer, useInventoryTransfer } from "@/lib/hooks/use-inventory";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { INVENTORY_PERMISSIONS } from "@ierp/shared";

const TR_WORKFLOW = [
  { id: "DRAFT", label: "Draft" },
  { id: "COMPLETED", label: "Completed" },
];

export default function TransferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(INVENTORY_PERMISSIONS.WRITE);
  const canLinkProducts = has(INVENTORY_PERMISSIONS.READ);
  const { data: transfer, loading, error, refetch } = useInventoryTransfer(id);
  const completeMutation = useCompleteTransfer();
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const lineColumns = useMemo(
    () => transferLineColumns(canLinkProducts),
    [canLinkProducts]
  );

  async function handleComplete() {
    if (completeMutation.isPending) return;
    setPending(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await completeMutation.mutateAsync({ id });
      setActionSuccess(t("inventory.transferCompleted"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <ModuleLayout>
        <InventoryPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !transfer) {
    return (
      <ModuleLayout maxWidth="lg">
        <TransactionWorkspace
          entityType="transfer"
          entityId={id}
          error={error ?? t("transaction.transferNotFound", "Transfer not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const canComplete = canWrite && transfer.canComplete;
  const totalQty = transfer.lines.reduce((sum, l) => sum + l.quantity, 0);
  const productCount = new Set(transfer.lines.map((l) => l.productId)).size;

  const headerActions: EntityAction[] = canComplete
    ? [
        {
          id: "complete",
          label: t("inventory.completeTransfer"),
          icon: <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />,
          kind: "primary",
          capability: "transition",
          pending,
          confirm: "soft",
          confirmTitle: t("inventory.completeTransfer"),
          confirmDescription: t(
            "inventory.completeTransferConfirm",
            "This will move stock from the source warehouse to the destination and create stock movements."
          ),
          onSelect: () => void handleComplete(),
        },
      ]
    : [];

  const relationItems = [
    {
      id: "source",
      label: transfer.sourceWarehouse.name,
      description: t("inventory.sourceWarehouse"),
      meta: transfer.sourceWarehouse.code,
      href: `/dashboard/inventory/warehouses/${transfer.sourceWarehouse.id}`,
    },
    {
      id: "destination",
      label: transfer.destinationWarehouse.name,
      description: t("inventory.destinationWarehouse"),
      meta: transfer.destinationWarehouse.code,
      href: `/dashboard/inventory/warehouses/${transfer.destinationWarehouse.id}`,
    },
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/inventory/transfers">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("transaction.backToTransfers", "Back to transfers")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <InventoryNavLinks />

      <TransactionWorkspace
        entityType="transfer"
        entityId={transfer.id}
        header={
          <EntityHeader
            breadcrumbs={[
              {
                label: t("nav.transfers", "Transfers"),
                href: "/dashboard/inventory/transfers",
              },
              { label: transfer.transferNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={<span className="ew-ltr-isolate">{transfer.transferNumber}</span>}
                  subtitle={`${transfer.sourceWarehouse.name} → ${transfer.destinationWarehouse.name}`}
                  trailing={
                    <EntityStatus
                      label={statusLabel(transfer.status)}
                      variant={transactionStatusVariant(transfer.status)}
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
                id: "qty",
                label: t("transaction.totalQty", "Total quantity"),
                value: String(totalQty),
              },
              {
                id: "products",
                label: t("transaction.products", "Products"),
                value: String(productCount),
              },
              {
                id: "source",
                label: t("inventory.sourceWarehouse"),
                value: transfer.sourceWarehouse.code,
              },
              {
                id: "destination",
                label: t("inventory.destinationWarehouse"),
                value: transfer.destinationWarehouse.code,
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
                    id: "source",
                    label: t("inventory.sourceWarehouse"),
                    value: (
                      <Link
                        href={`/dashboard/inventory/warehouses/${transfer.sourceWarehouse.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {transfer.sourceWarehouse.name}
                      </Link>
                    ),
                  },
                  {
                    id: "destination",
                    label: t("inventory.destinationWarehouse"),
                    value: (
                      <Link
                        href={`/dashboard/inventory/warehouses/${transfer.destinationWarehouse.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {transfer.destinationWarehouse.name}
                      </Link>
                    ),
                  },
                  {
                    id: "transfer-date",
                    label: t("transaction.transferDate", "Transfer date"),
                    value: formatDisplayDate(transfer.transferDate, locale),
                    mono: true,
                  },
                  {
                    id: "completed",
                    label: t("transaction.completedDate", "Completed"),
                    value: formatDisplayDate(transfer.completedDate, locale),
                    mono: true,
                  },
                ]}
              />
            </EntitySection>

            <TransactionalLineTable
              title={t("transaction.lineItems", "Line items")}
              description={t("transaction.transferLinesDesc", "Products to move between warehouses")}
              columns={lineColumns}
              data={transfer.lines}
            />

            <EntitySection id="inventory-impact" title={t("inventory.stockImpact")}>
              {transfer.lines.length === 0 ? (
                <EntityEmptyState
                  variant="empty"
                  density="compact"
                  title={t("transaction.noStockImpact", "No stock impact yet")}
                />
              ) : (
                <ul className="space-y-2">
                  {transfer.lines.map((line) => (
                    <li
                      key={line.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="ew-ltr-isolate font-mono">{line.sku}</span> · {line.productName}
                      </span>
                      <span className="font-medium tabular-nums text-[var(--accent)]">
                        −{line.quantity} / +{line.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </EntitySection>

            <EntityNotes notes={transfer.notes ? [{ id: "notes", body: transfer.notes }] : []} />

            <EntityLinkedAttachments
              module="OPERATIONS"
              entityType="transfer"
              entityId={transfer.id}
            />

            <EntityAudit
              meta={{
                id: transfer.id,
                createdAt: formatDisplayDate(transfer.transferDate, locale),
                createdBy: transfer.createdBy?.name,
                updatedAt: transfer.completedDate
                  ? formatDisplayDate(transfer.completedDate, locale)
                  : undefined,
              }}
            />
          </>
        }
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={statusLabel(transfer.status)}
              steps={
                transfer.status === "CANCELLED"
                  ? [{ id: "CANCELLED", label: "Cancelled", active: true }]
                  : buildLinearWorkflowSteps(
                      TR_WORKFLOW,
                      transfer.status === "IN_TRANSIT" ? "DRAFT" : transfer.status
                    )
              }
              defaultOpen
            />
            {transfer.createdBy ? (
              <EntityOwner
                name={transfer.createdBy.name}
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

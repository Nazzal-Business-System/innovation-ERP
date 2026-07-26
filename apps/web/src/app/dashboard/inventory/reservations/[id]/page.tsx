"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleLayout } from "@/components/layout/module-layout";
import { InventoryNavLinks } from "@/components/inventory/inventory-gate";
import { InventoryPageSkeleton } from "@/components/inventory/inventory-page-skeleton";
import { reservationLineColumns } from "@/components/inventory/inventory-columns";
import {
  EntityAudit,
  EntityFieldGrid,
  EntityHeader,
  EntityMetrics,
  EntityNotes,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTitle,
  EntityWorkflow,
  TransactionalLineTable,
  TransactionWorkspace,
} from "@/components/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import { formatDisplayDate } from "@/lib/date";
import { useInventoryReservation } from "@/lib/hooks/use-inventory";
import { useI18n } from "@/lib/i18n";

export default function ReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { data: reservation, loading, error, refetch } = useInventoryReservation(id);

  if (loading) {
    return (
      <ModuleLayout>
        <InventoryPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !reservation) {
    return (
      <ModuleLayout maxWidth="lg">
        <TransactionWorkspace
          entityType="reservation"
          entityId={id}
          error={mapTransactionUiError(
            error ? new Error(error) : null,
            t("transaction.reservationNotFound", "Reservation not found")
          )}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const relationItems = [
    {
      id: "sales-order",
      label: reservation.salesOrder.soNumber,
      description: t("transaction.salesOrder", "Sales order"),
      meta: statusLabel(reservation.salesOrder.status),
      href: `/dashboard/sales/orders/${reservation.salesOrder.id}`,
    },
    {
      id: "warehouse",
      label: reservation.warehouse.name,
      description: t("transaction.warehouse", "Warehouse"),
      meta: reservation.warehouse.code,
      href: `/dashboard/inventory/warehouses/${reservation.warehouse.id}`,
    },
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/inventory/reservations">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("transaction.backToReservations", "Back to reservations")}
          </Link>
        </Button>
      </div>

      <InventoryNavLinks />

      <TransactionWorkspace
        entityType="reservation"
        entityId={reservation.id}
        header={
          <EntityHeader
            breadcrumbs={[
              {
                label: t("nav.reservations", "Reservations"),
                href: "/dashboard/inventory/reservations",
              },
              { label: reservation.reservationNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={
                    <span className="ew-ltr-isolate">{reservation.reservationNumber}</span>
                  }
                  subtitle={`${reservation.salesOrder.soNumber} · ${reservation.warehouse.name}`}
                  trailing={
                    <EntityStatus
                      label={statusLabel(reservation.status)}
                      variant={transactionStatusVariant(reservation.status)}
                    />
                  }
                />
              </div>
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "reserved",
                label: t("inventory.reservedQty"),
                value: reservation.totalReservedQty.toLocaleString(),
              },
              {
                id: "available",
                label: t("inventory.availableQty"),
                value: reservation.totalAvailableQty.toLocaleString(),
              },
              {
                id: "lines",
                label: t("transaction.lineItems", "Line items"),
                value: String(reservation.lines.length),
              },
              {
                id: "warehouse",
                label: t("transaction.warehouse", "Warehouse"),
                value: reservation.warehouse.code,
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
                    id: "sales-order",
                    label: t("transaction.salesOrder", "Sales order"),
                    value: (
                      <Link
                        href={`/dashboard/sales/orders/${reservation.salesOrder.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {reservation.salesOrder.soNumber}
                      </Link>
                    ),
                  },
                  {
                    id: "so-status",
                    label: t("transaction.soStatus", "SO status"),
                    value: statusLabel(reservation.salesOrder.status),
                  },
                  {
                    id: "warehouse",
                    label: t("transaction.warehouse", "Warehouse"),
                    value: (
                      <Link
                        href={`/dashboard/inventory/warehouses/${reservation.warehouse.id}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {reservation.warehouse.name}
                      </Link>
                    ),
                  },
                  {
                    id: "reserved-date",
                    label: t("transaction.reservedDate", "Reserved date"),
                    value: formatDisplayDate(reservation.reservedDate, locale),
                    mono: true,
                  },
                  {
                    id: "released",
                    label: t("transaction.releasedDate", "Released"),
                    value: reservation.releasedDate
                      ? formatDisplayDate(reservation.releasedDate, locale)
                      : "—",
                    mono: true,
                  },
                ]}
              />
            </EntitySection>

            <TransactionalLineTable
              title={t("transaction.lineItems", "Line items")}
              description={t(
                "transaction.reservationLinesDesc",
                "Products reserved against available warehouse stock"
              )}
              columns={reservationLineColumns as never}
              data={reservation.lines}
            />

            <EntityNotes
              notes={
                reservation.notes
                  ? [{ id: "notes", body: reservation.notes }]
                  : []
              }
            />

            <EntityAudit
              meta={{
                id: reservation.id,
                createdAt: reservation.reservedDate,
                updatedAt: reservation.releasedDate ?? undefined,
              }}
            />
          </>
        }
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={statusLabel(reservation.status)}
              defaultOpen
            />
            <EntityRelations items={relationItems} />
          </>
        }
      />
    </ModuleLayout>
  );
}

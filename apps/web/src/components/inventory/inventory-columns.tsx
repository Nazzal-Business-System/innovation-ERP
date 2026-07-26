"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { InventoryMovement, InventoryProduct, InventoryReservation, InventoryTransfer, ReservationStatus, StockMovementType, TransferStatus } from "@ierp/shared";
import { StatusBadge } from "@/components/data-display/status-badge";
import { MasterDataLifecycleBadge } from "@/components/data-display/master-data-lifecycle-badge";
import { MovementBadge } from "@/components/inventory/movement-badge";
import { cn } from "@/lib/utils";

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  RECEIPT: "Receipt",
  ISSUE: "Issue",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  ADJUSTMENT: "Adjustment",
};

export function movementTypeVariant(type: StockMovementType): "active" | "pending" | "info" | "draft" {
  switch (type) {
    case "RECEIPT":
    case "TRANSFER_IN":
      return "active";
    case "ISSUE":
    case "TRANSFER_OUT":
      return "info";
    case "ADJUSTMENT":
      return "pending";
    default:
      return "draft";
  }
}

export const productColumns: ColumnDef<InventoryProduct>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/inventory/products/${row.original.id}`}
        className="font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.sku}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">{row.original.category}</span>
    ),
  },
  {
    accessorKey: "totalOnHand",
    header: "On hand",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.totalOnHand?.toLocaleString() ?? "—"}</span>
    ),
  },
  {
    accessorKey: "totalValue",
    header: "Value",
    cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.totalValue}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const product = row.original;
      const statusVariant =
        product.status === "ACTIVE"
          ? "active"
          : product.status === "DRAFT"
            ? "draft"
            : "inactive";
      const statusLabel =
        product.status === "ACTIVE"
          ? "Active"
          : product.status === "DRAFT"
            ? "Draft"
            : "Discontinued";
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={statusVariant} label={statusLabel} />
          {product.isArchived ? <MasterDataLifecycleBadge state="archived" /> : null}
        </div>
      );
    },
  },
  {
    id: "lowStock",
    header: "Stock",
    cell: ({ row }) =>
      row.original.isLowStock ? (
        <StatusBadge status="pending" label="Low" />
      ) : (
        <span className="text-xs text-[var(--muted)]">OK</span>
      ),
  },
];

export const movementColumns: ColumnDef<InventoryMovement>[] = [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums">
        {new Date(row.original.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <MovementBadge type={row.original.type} />,
  },
  {
    id: "product",
    header: "Product",
    cell: ({ row }) => (
      <div>
        <Link
          href={`/dashboard/inventory/products/${row.original.product.id}`}
          className="cursor-pointer text-sm font-medium text-[var(--accent)] hover:underline"
        >
          {row.original.product.sku}
        </Link>
        <p className="text-xs text-[var(--muted)]">{row.original.product.name}</p>
      </div>
    ),
  },
  {
    id: "warehouse",
    header: "Warehouse",
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.warehouse.code}</p>
        {row.original.toWarehouse && (
          <p className="text-xs text-[var(--muted)]">→ {row.original.toWarehouse.code}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Qty",
    cell: ({ row }) => {
      const q = row.original.quantity;
      return (
        <span
          className={cn(
            "tabular-nums font-semibold",
            q < 0 ? "text-[var(--destructive)]" : q > 0 ? "text-[var(--success)]" : "text-[var(--foreground)]"
          )}
        >
          {q > 0 ? `+${q}` : q}
        </span>
      );
    },
  },
  {
    accessorKey: "reference",
    header: "Reference",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-[var(--muted)]">{row.original.reference ?? "—"}</span>
    ),
  },
];

export function reservationStatusVariant(status: ReservationStatus): "active" | "pending" | "info" | "draft" {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "CONSUMED":
      return "info";
    case "RELEASED":
      return "pending";
    case "CANCELLED":
      return "draft";
    default:
      return "draft";
  }
}

export function transferStatusVariant(status: TransferStatus): "active" | "pending" | "info" | "draft" {
  switch (status) {
    case "COMPLETED":
      return "active";
    case "IN_TRANSIT":
      return "info";
    case "DRAFT":
      return "draft";
    case "CANCELLED":
      return "pending";
    default:
      return "draft";
  }
}

export const reservationColumns: ColumnDef<InventoryReservation>[] = [
  {
    accessorKey: "reservationNumber",
    header: "Reservation",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/inventory/reservations/${row.original.id}`}
        className="font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.reservationNumber}
      </Link>
    ),
  },
  {
    id: "salesOrder",
    header: "Sales Order",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/sales/orders/${row.original.salesOrder.id}`}
        className="font-medium hover:underline"
      >
        {row.original.salesOrder.soNumber}
      </Link>
    ),
  },
  {
    id: "warehouse",
    header: "Warehouse",
    cell: ({ row }) => <span className="text-sm">{row.original.warehouse.name}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={reservationStatusVariant(row.original.status)} label={row.original.status} />
    ),
  },
  {
    accessorKey: "totalReservedQty",
    header: "Reserved Qty",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.totalReservedQty.toLocaleString()}</span>
    ),
  },
  {
    accessorKey: "totalAvailableQty",
    header: "Available Qty",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.totalAvailableQty.toLocaleString()}</span>
    ),
  },
];

export const transferColumns: ColumnDef<InventoryTransfer>[] = [
  {
    accessorKey: "transferNumber",
    header: "Transfer",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/inventory/transfers/${row.original.id}`}
        className="font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.transferNumber}
      </Link>
    ),
  },
  {
    id: "source",
    header: "Source",
    cell: ({ row }) => <span className="text-sm">{row.original.sourceWarehouse.name}</span>,
  },
  {
    id: "destination",
    header: "Destination",
    cell: ({ row }) => <span className="text-sm">{row.original.destinationWarehouse.name}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        status={transferStatusVariant(row.original.status)}
        label={row.original.status.replace(/_/g, " ")}
      />
    ),
  },
  {
    accessorKey: "transferDate",
    header: "Transfer Date",
    cell: ({ row }) => <span className="text-sm text-[var(--muted)]">{row.original.transferDate}</span>,
  },
];

export const transferLineColumns: ColumnDef<InventoryTransfer["lines"][number]>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.sku}</span>,
  },
  {
    accessorKey: "productName",
    header: "Product",
    cell: ({ row }) => <span className="font-medium">{row.original.productName}</span>,
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.quantity.toLocaleString()}</span>
    ),
  },
];

export const reservationLineColumns: ColumnDef<InventoryReservation["lines"][number]>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.sku}</span>,
  },
  {
    accessorKey: "productName",
    header: "Product",
    cell: ({ row }) => <span className="font-medium">{row.original.productName}</span>,
  },
  {
    accessorKey: "quantity",
    header: "Reserved",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.quantity.toLocaleString()}</span>
    ),
  },
  {
    accessorKey: "availableAtWarehouse",
    header: "Available",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.availableAtWarehouse.toLocaleString()}</span>
    ),
  },
];

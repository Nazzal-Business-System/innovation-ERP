"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { ProcurementPurchaseOrder, ProcurementPurchaseOrderLine, ProcurementVendor } from "@ierp/shared";
import { MasterDataLifecycleBadge } from "@/components/data-display/master-data-lifecycle-badge";
import { PoStatusBadge } from "@/components/procurement/po-status-badge";
import { cn } from "@/lib/utils";

export const vendorColumns: ColumnDef<ProcurementVendor>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/procurement/vendors/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: "Vendor",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    id: "contact",
    header: "Contact",
    cell: ({ row }) => (
      <div>
        <p className="text-sm">{row.original.contactName ?? "—"}</p>
        {row.original.email && (
          <p className="text-xs text-[var(--muted)]">{row.original.email}</p>
        )}
      </div>
    ),
  },
  { accessorKey: "city", header: "City" },
  { accessorKey: "paymentTerms", header: "Terms" },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <MasterDataLifecycleBadge state={row.original.isActive ? "active" : "archived"} />
    ),
  },
  {
    id: "openPOs",
    header: "Open POs",
    cell: ({ row }) => (
      <span className={cn("tabular-nums font-medium", (row.original.openPurchaseOrders ?? 0) > 0 && "text-[var(--warning)]")}>
        {row.original.openPurchaseOrders ?? 0}
      </span>
    ),
  },
];

export const purchaseOrderColumns: ColumnDef<ProcurementPurchaseOrder>[] = [
  {
    accessorKey: "poNumber",
    header: "PO #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/procurement/purchase-orders/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.poNumber}
      </Link>
    ),
  },
  {
    id: "vendor",
    header: "Vendor",
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.vendor.name}</p>
        <p className="font-mono text-xs text-[var(--muted)]">{row.original.vendor.code}</p>
      </div>
    ),
  },
  {
    id: "warehouse",
    header: "Warehouse",
    cell: ({ row }) => (
      <div>
        <p className="text-sm">{row.original.warehouse.code}</p>
        <p className="text-xs text-[var(--muted)]">{row.original.warehouse.city}</p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <PoStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "orderDate",
    header: "Order date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums">{row.original.orderDate}</span>
    ),
  },
  {
    accessorKey: "expectedDate",
    header: "Expected",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums">
        {row.original.expectedDate ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">{row.original.totalAmount}</span>
    ),
  },
];

export const poLineColumns: ColumnDef<ProcurementPurchaseOrderLine>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">{row.original.sku}</span>
    ),
  },
  { accessorKey: "productName", header: "Product" },
  { accessorKey: "category", header: "Category" },
  {
    accessorKey: "quantity",
    header: "Qty",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">
        {row.original.quantity.toLocaleString()} {row.original.unit}
      </span>
    ),
  },
  {
    accessorKey: "unitCost",
    header: "Unit cost",
    cell: ({ row }) => <span className="tabular-nums">{row.original.unitCost}</span>,
  },
  {
    accessorKey: "lineTotal",
    header: "Line total",
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">{row.original.lineTotal}</span>
    ),
  },
];

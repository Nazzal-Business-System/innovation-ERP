"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { SalesCustomer, SalesOrder, SalesOrderLine } from "@ierp/shared";
import { MasterDataLifecycleBadge } from "@/components/data-display/master-data-lifecycle-badge";
import { SoStatusBadge, CUSTOMER_TYPE_LABELS } from "@/components/sales/so-status-badge";
import { cn } from "@/lib/utils";

export const customerColumns: ColumnDef<SalesCustomer>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/sales/customers/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.code}
      </Link>
    ),
  },
  {
    accessorKey: "name",
    header: "Customer",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "customerType",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-sm text-[var(--muted)]">
        {CUSTOMER_TYPE_LABELS[row.original.customerType]}
      </span>
    ),
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
    accessorKey: "creditLimit",
    header: "Credit limit",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.creditLimit}</span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <MasterDataLifecycleBadge state={row.original.isActive ? "active" : "archived"} />
    ),
  },
];

export const salesOrderColumns: ColumnDef<SalesOrder>[] = [
  {
    accessorKey: "soNumber",
    header: "SO #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/sales/orders/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.soNumber}
      </Link>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.customer.name}</p>
        <p className="font-mono text-xs text-[var(--muted)]">{row.original.customer.code}</p>
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
    cell: ({ row }) => <SoStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "orderDate",
    header: "Order date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums">{row.original.orderDate}</span>
    ),
  },
  {
    accessorKey: "expectedDeliveryDate",
    header: "Expected",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-sm tabular-nums">
        {row.original.expectedDeliveryDate ?? "—"}
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

export const soLineColumns: ColumnDef<SalesOrderLine>[] = [
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
    accessorKey: "unitPrice",
    header: "Unit price",
    cell: ({ row }) => <span className="tabular-nums">{row.original.unitPrice}</span>,
  },
  {
    accessorKey: "lineTotal",
    header: "Line total",
    cell: ({ row }) => (
      <span className={cn("font-semibold tabular-nums")}>{row.original.lineTotal}</span>
    ),
  },
];

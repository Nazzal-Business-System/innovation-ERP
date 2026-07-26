"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  OperationsDelivery,
  OperationsDeliveryLine,
  OperationsGoodsReceipt,
  OperationsGoodsReceiptLine,
} from "@ierp/shared";
import { DeliveryStatusBadge, GoodsReceiptStatusBadge } from "./operations-status-badge";

export const goodsReceiptColumns: ColumnDef<OperationsGoodsReceipt>[] = [
  {
    accessorKey: "receiptNumber",
    header: "Receipt #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/operations/goods-receipts/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.receiptNumber}
      </Link>
    ),
  },
  {
    id: "po",
    header: "PO #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/procurement/purchase-orders/${row.original.purchaseOrder.id}`}
        className="cursor-pointer font-mono text-sm text-[var(--accent)] hover:underline"
      >
        {row.original.purchaseOrder.poNumber}
      </Link>
    ),
  },
  {
    id: "warehouse",
    header: "Warehouse",
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.warehouse.name}</p>
        <p className="font-mono text-xs text-[var(--muted)]">{row.original.warehouse.code}</p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <GoodsReceiptStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "receivedDate",
    header: "Received",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{row.original.receivedDate ?? "—"}</span>
    ),
  },
  {
    id: "receivedBy",
    header: "Received by",
    cell: ({ row }) => <span className="text-sm">{row.original.receivedBy?.name ?? "—"}</span>,
  },
  {
    id: "lines",
    header: "Lines",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.lineCount ?? "—"}</span>
    ),
  },
];

export const goodsReceiptLineColumns: ColumnDef<OperationsGoodsReceiptLine>[] = [
  { accessorKey: "sku", header: "SKU", cell: ({ row }) => <span className="font-mono text-sm">{row.original.sku}</span> },
  { accessorKey: "productName", header: "Product" },
  { accessorKey: "orderedQuantity", header: "Ordered", cell: ({ row }) => <span className="tabular-nums">{row.original.orderedQuantity}</span> },
  { accessorKey: "receivedQuantity", header: "Received", cell: ({ row }) => <span className="tabular-nums font-medium text-[var(--success)]">{row.original.receivedQuantity}</span> },
  { accessorKey: "rejectedQuantity", header: "Rejected", cell: ({ row }) => <span className="tabular-nums text-[var(--warning)]">{row.original.rejectedQuantity}</span> },
];

export const deliveryColumns: ColumnDef<OperationsDelivery>[] = [
  {
    accessorKey: "deliveryNumber",
    header: "Delivery #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/operations/deliveries/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.deliveryNumber}
      </Link>
    ),
  },
  {
    id: "so",
    header: "SO #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/sales/orders/${row.original.salesOrder.id}`}
        className="cursor-pointer font-mono text-sm text-[var(--accent)] hover:underline"
      >
        {row.original.salesOrder.soNumber}
      </Link>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => <span className="text-sm font-medium">{row.original.customer.name}</span>,
  },
  {
    id: "warehouse",
    header: "Warehouse",
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium">{row.original.warehouse.name}</p>
        <p className="font-mono text-xs text-[var(--muted)]">{row.original.warehouse.code}</p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <DeliveryStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "deliveryDate",
    header: "Delivery date",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{row.original.deliveryDate ?? "—"}</span>
    ),
  },
  {
    id: "deliveredBy",
    header: "Delivered by",
    cell: ({ row }) => <span className="text-sm">{row.original.deliveredBy?.name ?? "—"}</span>,
  },
  {
    id: "lines",
    header: "Lines",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.lineCount ?? "—"}</span>
    ),
  },
];

export const deliveryLineColumns: ColumnDef<OperationsDeliveryLine>[] = [
  { accessorKey: "sku", header: "SKU", cell: ({ row }) => <span className="font-mono text-sm">{row.original.sku}</span> },
  { accessorKey: "productName", header: "Product" },
  { accessorKey: "orderedQuantity", header: "Ordered", cell: ({ row }) => <span className="tabular-nums">{row.original.orderedQuantity}</span> },
  { accessorKey: "deliveredQuantity", header: "Delivered", cell: ({ row }) => <span className="tabular-nums font-medium text-[var(--success)]">{row.original.deliveredQuantity}</span> },
  { accessorKey: "returnedQuantity", header: "Returned", cell: ({ row }) => <span className="tabular-nums text-[var(--warning)]">{row.original.returnedQuantity}</span> },
  {
    id: "available",
    header: "Available",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm text-[var(--muted)]">
        {row.original.availableStock !== undefined ? row.original.availableStock : "—"}
      </span>
    ),
  },
];

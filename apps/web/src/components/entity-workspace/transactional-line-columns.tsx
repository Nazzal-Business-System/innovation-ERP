"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  FinanceCustomerInvoiceLine,
  FinanceVendorBillLine,
  InventoryTransferLine,
  JournalEntryLine,
  OperationsDeliveryLine,
  OperationsGoodsReceiptLine,
  ProcurementPurchaseOrderLine,
  SalesOrderLine,
} from "@ierp/shared";
import { TransactionalSkuCell } from "@/components/entity-workspace/transactional-line-table";
import { cn } from "@/lib/utils";

export function salesOrderLineColumns(canLinkProducts: boolean): ColumnDef<SalesOrderLine>[] {
  return [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <TransactionalSkuCell line={row.original} canLink={canLinkProducts} />,
    },
    { accessorKey: "productName", header: "Product" },
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
      cell: ({ row }) => <span className="ew-ltr-isolate tabular-nums">{row.original.unitPrice}</span>,
    },
    {
      accessorKey: "lineTotal",
      header: "Line total",
      cell: ({ row }) => (
        <span className={cn("ew-ltr-isolate font-semibold tabular-nums")}>{row.original.lineTotal}</span>
      ),
    },
  ];
}

export function purchaseOrderLineColumns(
  canLinkProducts: boolean
): ColumnDef<ProcurementPurchaseOrderLine>[] {
  return [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <TransactionalSkuCell line={row.original} canLink={canLinkProducts} />,
    },
    { accessorKey: "productName", header: "Product" },
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
      cell: ({ row }) => <span className="ew-ltr-isolate tabular-nums">{row.original.unitCost}</span>,
    },
    {
      accessorKey: "lineTotal",
      header: "Line total",
      cell: ({ row }) => (
        <span className={cn("ew-ltr-isolate font-semibold tabular-nums")}>{row.original.lineTotal}</span>
      ),
    },
  ];
}

export function deliveryLineColumns(canLinkProducts: boolean): ColumnDef<OperationsDeliveryLine>[] {
  return [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <TransactionalSkuCell line={row.original} canLink={canLinkProducts} />,
    },
    { accessorKey: "productName", header: "Product" },
    {
      accessorKey: "orderedQuantity",
      header: "Ordered",
      cell: ({ row }) => <span className="tabular-nums">{row.original.orderedQuantity}</span>,
    },
    {
      accessorKey: "deliveredQuantity",
      header: "Delivered",
      cell: ({ row }) => (
        <span className="tabular-nums font-medium text-[var(--success)]">
          {row.original.deliveredQuantity}
        </span>
      ),
    },
    {
      accessorKey: "returnedQuantity",
      header: "Returned",
      cell: ({ row }) => (
        <span className="tabular-nums text-[var(--warning)]">{row.original.returnedQuantity}</span>
      ),
    },
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
}

export function goodsReceiptLineColumns(
  canLinkProducts: boolean
): ColumnDef<OperationsGoodsReceiptLine>[] {
  return [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <TransactionalSkuCell line={row.original} canLink={canLinkProducts} />,
    },
    { accessorKey: "productName", header: "Product" },
    {
      accessorKey: "orderedQuantity",
      header: "Expected",
      cell: ({ row }) => <span className="tabular-nums">{row.original.orderedQuantity}</span>,
    },
    {
      accessorKey: "receivedQuantity",
      header: "Received",
      cell: ({ row }) => (
        <span className="tabular-nums font-medium text-[var(--success)]">
          {row.original.receivedQuantity}
        </span>
      ),
    },
    {
      id: "variance",
      header: "Variance",
      cell: ({ row }) => {
        const variance = row.original.receivedQuantity - row.original.orderedQuantity;
        return (
          <span
            className={cn(
              "tabular-nums",
              variance < 0 ? "text-[var(--warning)]" : variance > 0 ? "text-[var(--info)]" : ""
            )}
          >
            {variance > 0 ? `+${variance}` : variance}
          </span>
        );
      },
    },
    {
      accessorKey: "rejectedQuantity",
      header: "Rejected",
      cell: ({ row }) => (
        <span className="tabular-nums text-[var(--warning)]">{row.original.rejectedQuantity}</span>
      ),
    },
  ];
}

export function transferLineColumns(canLinkProducts: boolean): ColumnDef<InventoryTransferLine>[] {
  return [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <TransactionalSkuCell line={row.original} canLink={canLinkProducts} />,
    },
    { accessorKey: "productName", header: "Product" },
    {
      accessorKey: "quantity",
      header: "Qty",
      cell: ({ row }) => <span className="tabular-nums font-medium">{row.original.quantity}</span>,
    },
  ];
}

export function invoiceLineColumns(canLinkProducts: boolean): ColumnDef<FinanceCustomerInvoiceLine>[] {
  return [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => {
        const line = row.original;
        if (canLinkProducts && line.productId && line.sku) {
          return (
            <TransactionalSkuCell
              line={{ productId: line.productId, sku: line.sku, productName: line.description }}
              canLink={canLinkProducts}
            />
          );
        }
        return <span className="ew-ltr-isolate font-mono text-sm">{line.sku ?? "—"}</span>;
      },
    },
    { accessorKey: "description", header: "Description" },
    {
      accessorKey: "quantity",
      header: "Qty",
      cell: ({ row }) => <span className="tabular-nums">{row.original.quantity}</span>,
    },
    {
      accessorKey: "unitPrice",
      header: "Unit price",
      cell: ({ row }) => (
        <span className="ew-ltr-isolate tabular-nums">{row.original.unitPrice}</span>
      ),
    },
    {
      accessorKey: "lineTotal",
      header: "Line total",
      cell: ({ row }) => (
        <span className="ew-ltr-isolate font-semibold tabular-nums">{row.original.lineTotal}</span>
      ),
    },
  ];
}

export function billLineColumns(canLinkProducts: boolean): ColumnDef<FinanceVendorBillLine>[] {
  return [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => {
        const line = row.original;
        if (canLinkProducts && line.productId && line.sku) {
          return (
            <TransactionalSkuCell
              line={{ productId: line.productId, sku: line.sku, productName: line.description }}
              canLink={canLinkProducts}
            />
          );
        }
        return <span className="ew-ltr-isolate font-mono text-sm">{line.sku ?? "—"}</span>;
      },
    },
    { accessorKey: "description", header: "Description" },
    {
      accessorKey: "quantity",
      header: "Qty",
      cell: ({ row }) => <span className="tabular-nums">{row.original.quantity}</span>,
    },
    {
      accessorKey: "unitCost",
      header: "Unit cost",
      cell: ({ row }) => (
        <span className="ew-ltr-isolate tabular-nums">{row.original.unitCost}</span>
      ),
    },
    {
      accessorKey: "lineTotal",
      header: "Line total",
      cell: ({ row }) => (
        <span className="ew-ltr-isolate font-semibold tabular-nums">{row.original.lineTotal}</span>
      ),
    },
  ];
}

export function journalEntryLineColumns(
  canLinkAccounts: boolean
): ColumnDef<JournalEntryLine>[] {
  return [
    {
      accessorKey: "accountCode",
      header: "Account",
      cell: ({ row }) => {
        const line = row.original;
        if (canLinkAccounts) {
          return (
            <Link
              href={`/dashboard/accounting/chart-of-accounts/${line.accountId}`}
              className="ew-ltr-isolate font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
            >
              {line.accountCode}
            </Link>
          );
        }
        return <span className="ew-ltr-isolate font-mono text-sm">{line.accountCode}</span>;
      },
    },
    { accessorKey: "accountName", header: "Name" },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description ?? "—",
    },
    {
      accessorKey: "debit",
      header: "Debit",
      cell: ({ row }) => (
        <span className="ew-ltr-isolate tabular-nums">{row.original.debit}</span>
      ),
    },
    {
      accessorKey: "credit",
      header: "Credit",
      cell: ({ row }) => (
        <span className="ew-ltr-isolate tabular-nums">{row.original.credit}</span>
      ),
    },
  ];
}

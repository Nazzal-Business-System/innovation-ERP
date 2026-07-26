"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  FinanceAgingReport,
  FinanceCustomerInvoice,
  FinanceCustomerInvoiceLine,
  FinanceCustomerPayment,
  FinanceVendorBill,
  FinanceVendorBillLine,
  FinanceVendorPayment,
} from "@ierp/shared";
import { BillStatusBadge, InvoiceStatusBadge, PaymentMethodBadge } from "./finance-status-badge";

export const customerInvoiceColumns: ColumnDef<FinanceCustomerInvoice>[] = [
  {
    accessorKey: "invoiceNumber",
    header: "Invoice #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/finance/customer-invoices/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.invoiceNumber}
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
    id: "so",
    header: "SO #",
    cell: ({ row }) =>
      row.original.salesOrder ? (
        <Link
          href={`/dashboard/sales/orders/${row.original.salesOrder.id}`}
          className="cursor-pointer font-mono text-sm text-[var(--accent)] hover:underline"
        >
          {row.original.salesOrder.soNumber}
        </Link>
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "dueDate",
    header: "Due",
    cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.dueDate}</span>,
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.totalAmount}</span>
    ),
  },
  {
    accessorKey: "balanceDue",
    header: "Balance",
    cell: ({ row }) => (
      <span className="tabular-nums text-[var(--warning)]">{row.original.balanceDue}</span>
    ),
  },
];

export const invoiceLineColumns: ColumnDef<FinanceCustomerInvoiceLine>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.sku ?? "—"}</span>
    ),
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
    cell: ({ row }) => <span className="tabular-nums">{row.original.unitPrice}</span>,
  },
  {
    accessorKey: "lineTotal",
    header: "Total",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.lineTotal}</span>
    ),
  },
];

export const customerPaymentColumns: ColumnDef<FinanceCustomerPayment>[] = [
  {
    accessorKey: "paymentNumber",
    header: "Payment #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/finance/customer-payments/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.paymentNumber}
      </Link>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <span className="text-sm font-medium">{row.original.customer.name}</span>
    ),
  },
  {
    id: "invoice",
    header: "Invoice",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/finance/customer-invoices/${row.original.invoice.id}`}
        className="cursor-pointer font-mono text-sm text-[var(--accent)] hover:underline"
      >
        {row.original.invoice.invoiceNumber}
      </Link>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium text-[var(--success)]">
        {row.original.amount}
      </span>
    ),
  },
  {
    accessorKey: "paymentMethod",
    header: "Method",
    cell: ({ row }) => <PaymentMethodBadge method={row.original.paymentMethod} />,
  },
  {
    accessorKey: "paymentDate",
    header: "Date",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{row.original.paymentDate}</span>
    ),
  },
];

export const vendorBillColumns: ColumnDef<FinanceVendorBill>[] = [
  {
    accessorKey: "billNumber",
    header: "Bill #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/finance/vendor-bills/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.billNumber}
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
    id: "po",
    header: "PO #",
    cell: ({ row }) =>
      row.original.purchaseOrder ? (
        <Link
          href={`/dashboard/procurement/purchase-orders/${row.original.purchaseOrder.id}`}
          className="cursor-pointer font-mono text-sm text-[var(--accent)] hover:underline"
        >
          {row.original.purchaseOrder.poNumber}
        </Link>
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <BillStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "dueDate",
    header: "Due",
    cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.dueDate}</span>,
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.totalAmount}</span>
    ),
  },
  {
    accessorKey: "balanceDue",
    header: "Balance",
    cell: ({ row }) => (
      <span className="tabular-nums text-[var(--warning)]">{row.original.balanceDue}</span>
    ),
  },
];

export const billLineColumns: ColumnDef<FinanceVendorBillLine>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.sku ?? "—"}</span>
    ),
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
    cell: ({ row }) => <span className="tabular-nums">{row.original.unitCost}</span>,
  },
  {
    accessorKey: "lineTotal",
    header: "Total",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium">{row.original.lineTotal}</span>
    ),
  },
];

export const vendorPaymentColumns: ColumnDef<FinanceVendorPayment>[] = [
  {
    accessorKey: "paymentNumber",
    header: "Payment #",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/finance/vendor-payments/${row.original.id}`}
        className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
      >
        {row.original.paymentNumber}
      </Link>
    ),
  },
  {
    id: "vendor",
    header: "Vendor",
    cell: ({ row }) => (
      <span className="text-sm font-medium">{row.original.vendor.name}</span>
    ),
  },
  {
    id: "bill",
    header: "Bill",
    cell: ({ row }) => (
      <Link
        href={`/dashboard/finance/vendor-bills/${row.original.bill.id}`}
        className="cursor-pointer font-mono text-sm text-[var(--accent)] hover:underline"
      >
        {row.original.bill.billNumber}
      </Link>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="tabular-nums font-medium text-[var(--destructive)]">
        {row.original.amount}
      </span>
    ),
  },
  {
    accessorKey: "paymentMethod",
    header: "Method",
    cell: ({ row }) => <PaymentMethodBadge method={row.original.paymentMethod} />,
  },
  {
    accessorKey: "paymentDate",
    header: "Date",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm">{row.original.paymentDate}</span>
    ),
  },
];

export function agingItemColumns(
  kind: "ar" | "ap"
): ColumnDef<FinanceAgingReport["items"][0]>[] {
  const hrefFor = (id: string) =>
    kind === "ar"
      ? `/dashboard/finance/customer-invoices/${id}`
      : `/dashboard/finance/vendor-bills/${id}`;

  return [
    {
      accessorKey: "documentNumber",
      header: "Document #",
      cell: ({ row }) => (
        <Link
          href={hrefFor(row.original.id)}
          className="cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          {row.original.documentNumber}
        </Link>
      ),
    },
    {
      accessorKey: "partyName",
      header: "Party",
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.partyName}</span>,
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.dueDate}</span>,
    },
    {
      accessorKey: "daysPastDue",
      header: "Days past due",
      cell: ({ row }) => <span className="tabular-nums">{row.original.daysPastDue}</span>,
    },
    {
      accessorKey: "bucket",
      header: "Bucket",
      cell: ({ row }) => <span className="text-sm">{row.original.bucket}</span>,
    },
    {
      accessorKey: "balanceDue",
      header: "Balance",
      cell: ({ row }) => (
        <span className="tabular-nums font-medium">{row.original.balanceDue}</span>
      ),
    },
  ];
}

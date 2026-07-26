"use client";

import type { BillStatus, InvoiceStatus } from "@ierp/shared";
import { Ban, CheckCircle2, FileEdit, Send, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
};

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)]",
  SENT: "border-[var(--info)]/25 bg-[var(--info-bg)] text-[var(--info)]",
  PARTIALLY_PAID: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
  PAID: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  OVERDUE: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
  VOID: "border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted-foreground)]",
};

export function InvoiceStatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  const Icon =
    status === "PAID"
      ? CheckCircle2
      : status === "OVERDUE"
        ? AlertTriangle
        : status === "SENT"
          ? Send
          : status === "VOID"
            ? Ban
            : FileEdit;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        INVOICE_STATUS_STYLES[status],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  DRAFT: "Draft",
  RECEIVED: "Received",
  PARTIALLY_PAID: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
};

const BILL_STATUS_STYLES: Record<BillStatus, string> = {
  DRAFT: "border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)]",
  RECEIVED: "border-[var(--info)]/25 bg-[var(--info-bg)] text-[var(--info)]",
  PARTIALLY_PAID: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
  PAID: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  OVERDUE: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
  VOID: "border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted-foreground)]",
};

export function BillStatusBadge({ status, className }: { status: BillStatus; className?: string }) {
  const Icon =
    status === "PAID"
      ? CheckCircle2
      : status === "OVERDUE"
        ? AlertTriangle
        : status === "RECEIVED"
          ? Send
          : status === "VOID"
            ? Ban
            : FileEdit;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        BILL_STATUS_STYLES[status],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {BILL_STATUS_LABELS[status]}
    </span>
  );
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  CHECK: "Check",
  WALLET: "Wallet",
};

export function PaymentMethodBadge({ method }: { method: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--muted-bg)]/50 px-2.5 py-0.5 text-xs font-medium text-[var(--muted)]">
      {PAYMENT_METHOD_LABELS[method] ?? method}
    </span>
  );
}

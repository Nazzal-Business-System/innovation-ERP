"use client";

import type { PurchaseOrderStatus } from "@ierp/shared";
import {
  Ban,
  CheckCircle2,
  Clock,
  FileEdit,
  PackageCheck,
  Send,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  APPROVED: "Approved",
  PARTIALLY_RECEIVED: "Partially received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

const PO_STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  DRAFT: "border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)]",
  SENT: "border-[var(--info)]/25 bg-[var(--info-bg)] text-[var(--info)]",
  APPROVED: "border-[var(--accent)]/25 bg-[var(--accent-muted)] text-[var(--accent)]",
  PARTIALLY_RECEIVED: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
  RECEIVED: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  CANCELLED: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
};

const PO_STATUS_ICONS: Record<PurchaseOrderStatus, typeof FileEdit> = {
  DRAFT: FileEdit,
  SENT: Send,
  APPROVED: CheckCircle2,
  PARTIALLY_RECEIVED: Truck,
  RECEIVED: PackageCheck,
  CANCELLED: Ban,
};

interface PoStatusBadgeProps {
  status: PurchaseOrderStatus;
  className?: string;
}

export function PoStatusBadge({ status, className }: PoStatusBadgeProps) {
  const Icon = PO_STATUS_ICONS[status] ?? Clock;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        PO_STATUS_STYLES[status],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {PO_STATUS_LABELS[status]}
    </span>
  );
}

export function poStatusVariant(
  status: PurchaseOrderStatus
): "active" | "pending" | "info" | "draft" | "error" {
  switch (status) {
    case "RECEIVED":
      return "active";
    case "APPROVED":
      return "info";
    case "PARTIALLY_RECEIVED":
    case "SENT":
      return "pending";
    case "CANCELLED":
      return "error";
    default:
      return "draft";
  }
}

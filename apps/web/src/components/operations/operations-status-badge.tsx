"use client";

import type { DeliveryStatus, GoodsReceiptStatus } from "@ierp/shared";
import { Ban, Clock, FileEdit, Package, PackageCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export const GR_STATUS_LABELS: Record<GoodsReceiptStatus, string> = {
  DRAFT: "Draft",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

const GR_STATUS_STYLES: Record<GoodsReceiptStatus, string> = {
  DRAFT: "border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)]",
  RECEIVED: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  CANCELLED: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
};

const GR_STATUS_ICONS: Record<GoodsReceiptStatus, typeof FileEdit> = {
  DRAFT: FileEdit,
  RECEIVED: PackageCheck,
  CANCELLED: Ban,
};

export function GoodsReceiptStatusBadge({
  status,
  className,
}: {
  status: GoodsReceiptStatus;
  className?: string;
}) {
  const Icon = GR_STATUS_ICONS[status] ?? Clock;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        GR_STATUS_STYLES[status],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {GR_STATUS_LABELS[status]}
    </span>
  );
}

export const DL_STATUS_LABELS: Record<DeliveryStatus, string> = {
  DRAFT: "Draft",
  PICKED: "Picked",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const DL_STATUS_STYLES: Record<DeliveryStatus, string> = {
  DRAFT: "border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)]",
  PICKED: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
  DELIVERED: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  CANCELLED: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
};

const DL_STATUS_ICONS: Record<DeliveryStatus, typeof FileEdit> = {
  DRAFT: FileEdit,
  PICKED: Package,
  DELIVERED: Truck,
  CANCELLED: Ban,
};

export function DeliveryStatusBadge({
  status,
  className,
}: {
  status: DeliveryStatus;
  className?: string;
}) {
  const Icon = DL_STATUS_ICONS[status] ?? Clock;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        DL_STATUS_STYLES[status],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {DL_STATUS_LABELS[status]}
    </span>
  );
}

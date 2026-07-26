"use client";

import type { SalesOrderStatus } from "@ierp/shared";
import {
  Ban,
  CheckCircle2,
  ClipboardList,
  FileEdit,
  Package,
  Receipt,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const SO_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PICKING: "Picking",
  READY_TO_SHIP: "Ready to ship",
  DELIVERED: "Delivered",
  INVOICED: "Invoiced",
  CANCELLED: "Cancelled",
};

const SO_STATUS_STYLES: Record<SalesOrderStatus, string> = {
  DRAFT: "border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)]",
  CONFIRMED: "border-[var(--info)]/25 bg-[var(--info-bg)] text-[var(--info)]",
  PICKING: "border-[var(--accent)]/25 bg-[var(--accent-muted)] text-[var(--accent)]",
  READY_TO_SHIP: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
  DELIVERED: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  INVOICED: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  CANCELLED: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
};

const SO_STATUS_ICONS: Record<SalesOrderStatus, typeof FileEdit> = {
  DRAFT: FileEdit,
  CONFIRMED: CheckCircle2,
  PICKING: ClipboardList,
  READY_TO_SHIP: Package,
  DELIVERED: Truck,
  INVOICED: Receipt,
  CANCELLED: Ban,
};

interface SoStatusBadgeProps {
  status: SalesOrderStatus;
  className?: string;
}

export function SoStatusBadge({ status, className }: SoStatusBadgeProps) {
  const Icon = SO_STATUS_ICONS[status] ?? FileEdit;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        SO_STATUS_STYLES[status],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {SO_STATUS_LABELS[status]}
    </span>
  );
}

export const CUSTOMER_TYPE_LABELS = {
  RETAILER: "Retailer",
  WHOLESALER: "Wholesaler",
  CORPORATE: "Corporate",
  DISTRIBUTOR: "Distributor",
} as const;

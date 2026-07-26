"use client";

import type { StockMovementType } from "@ierp/shared";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  PackagePlus,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOVEMENT_TYPE_LABELS, movementTypeVariant } from "./inventory-columns";

const MOVEMENT_ICONS: Record<StockMovementType, typeof PackagePlus> = {
  RECEIPT: PackagePlus,
  ISSUE: ArrowUpRight,
  TRANSFER_IN: ArrowDownLeft,
  TRANSFER_OUT: ArrowUpRight,
  ADJUSTMENT: SlidersHorizontal,
};

const MOVEMENT_STYLES: Record<
  ReturnType<typeof movementTypeVariant>,
  string
> = {
  active: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
  info: "border-[var(--info)]/25 bg-[var(--info-bg)] text-[var(--info)]",
  pending: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
  draft: "border-[var(--border)] bg-transparent text-[var(--muted)]",
};

interface MovementBadgeProps {
  type: StockMovementType;
  className?: string;
}

export function MovementBadge({ type, className }: MovementBadgeProps) {
  const variant = movementTypeVariant(type);
  const Icon = MOVEMENT_ICONS[type] ?? ArrowLeftRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        MOVEMENT_STYLES[variant],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      {MOVEMENT_TYPE_LABELS[type]}
    </span>
  );
}

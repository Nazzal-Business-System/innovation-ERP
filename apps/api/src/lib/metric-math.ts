/**
 * Shared metric arithmetic for KPI / report accuracy.
 * Format money only after aggregation — never sum formatted strings.
 */

export type TrendDirection = "up" | "down" | "neutral";

export interface PeriodBounds {
  label: string;
  start: Date;
  end: Date;
  priorStart: Date;
  priorEnd: Date;
}

/** Local calendar month containing `now` (Jordan-friendly; no UTC day shift). */
export function currentMonthBounds(now = new Date()): PeriodBounds {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const priorEnd = new Date(start.getTime() - 1);
  const priorStart = new Date(priorEnd.getFullYear(), priorEnd.getMonth(), 1, 0, 0, 0, 0);
  const label = start.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return { label, start, end, priorStart, priorEnd };
}

/** Local calendar month key YYYY-MM from a Date (not UTC ISO). */
export function localMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * percentage change = (current - previous) / abs(previous) × 100
 * previous = 0 → "New" or "No comparison data" (never Infinity).
 */
export function percentChange(
  current: number,
  previous: number,
  opts?: { priorLabel?: string }
): {
  changePercent: number | undefined;
  trend: TrendDirection;
  comparison: string;
} {
  const priorLabel = opts?.priorLabel ?? "vs prior month";
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return { changePercent: undefined, trend: "neutral", comparison: "No comparison data" };
  }
  if (previous === 0) {
    if (current === 0) {
      return { changePercent: undefined, trend: "neutral", comparison: "No comparison data" };
    }
    return { changePercent: undefined, trend: "up", comparison: "New" };
  }
  const raw = ((current - previous) / Math.abs(previous)) * 100;
  const changePercent = Math.round(raw * 10) / 10;
  const trend: TrendDirection =
    changePercent > 0.05 ? "up" : changePercent < -0.05 ? "down" : "neutral";
  const sign = changePercent > 0 ? "+" : "";
  return {
    changePercent,
    trend,
    comparison: `${sign}${changePercent.toFixed(1)}% ${priorLabel}`,
  };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function sumDecimalLike(values: Array<number | { toString(): string }>): number {
  let total = 0;
  for (const v of values) {
    total += typeof v === "number" ? v : Number(v);
  }
  return roundMoney(total);
}

/** Σ (qtyOnHand × unitCost) — format only after this. */
export function inventoryValuationFromRows(
  rows: ReadonlyArray<{ quantityOnHand: number; unitCost: number }>
): number {
  let total = 0;
  for (const row of rows) {
    total += row.quantityOnHand * row.unitCost;
  }
  return roundMoney(total);
}

/** Domain rule: available = onHand − reserved (never fabricate). */
export function availableQuantity(onHand: number, reserved: number): number {
  return onHand - reserved;
}

/** Posted journal integrity: Σ debit === Σ credit within 0.01. */
export function journalDebitsEqualCredits(
  lines: ReadonlyArray<{ debit: number; credit: number }>,
  tolerance = 0.01
): { balanced: boolean; totalDebit: number; totalCredit: number } {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    totalDebit += line.debit;
    totalCredit += line.credit;
  }
  totalDebit = roundMoney(totalDebit);
  totalCredit = roundMoney(totalCredit);
  return {
    balanced: Math.abs(totalDebit - totalCredit) < tolerance,
    totalDebit,
    totalCredit,
  };
}

/** Payroll run net must equal sum of line net pays. */
export function payrollRunEqualsLineSum(runNetTotal: number, lineNetPays: readonly number[]): boolean {
  return Math.abs(roundMoney(runNetTotal) - sumDecimalLike([...lineNetPays])) < 0.01;
}

const TERMINAL_SUPPORT = new Set(["RESOLVED", "CLOSED", "CANCELLED"]);

/** Overdue = open ticket with dueAt < now. */
export function isSupportTicketOverdue(
  status: string,
  dueAt: Date | null | undefined,
  now = new Date()
): boolean {
  if (!dueAt || TERMINAL_SUPPORT.has(status)) return false;
  return dueAt.getTime() < now.getTime();
}

export type DocumentExpiryBucket = "active" | "expiring" | "expired" | "none";

/** Mutually exclusive expiry buckets (no double-count). */
export function documentExpiryBucket(
  expiryDate: Date | null | undefined,
  now = new Date(),
  expiringWithinDays = 30
): DocumentExpiryBucket {
  if (!expiryDate) return "none";
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  if (expiry < startOfToday) return "expired";
  const limit = new Date(startOfToday);
  limit.setDate(limit.getDate() + expiringWithinDays);
  if (expiry <= limit) return "expiring";
  return "active";
}

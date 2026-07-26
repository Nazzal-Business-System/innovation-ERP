/**
 * Shared money helpers for ERP amounts.
 *
 * API payroll fields use canonical decimal strings (`"1507.50"`).
 * Display formatting (`JOD 1,507.50`) happens only at render time.
 */

const CANONICAL_DECIMAL = /^-?\d+(?:\.\d+)?$/;
const LEGACY_CURRENCY = /^(?:JOD|USD|EUR|GBP)\s*/i;

export type MoneyParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: "missing" | "invalid" };

/** Round to 2 decimal places using integer cents to limit float drift. */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Parse an API/raw money value into a finite number.
 * Accepts:
 * - number
 * - canonical decimal string (`"1507.50"`)
 * - Prisma Decimal-like (`{ toString(): "1507.5" }`)
 * - legacy display strings (`"JOD 1,507.50"`) for compatibility
 *
 * Never returns NaN. Invalid input → `{ ok: false }`.
 * Does not coerce malformed values to 0.
 */
export function parseMoneyAmount(value: unknown): MoneyParseResult {
  if (value === null || value === undefined || value === "") {
    return { ok: false, reason: "missing" };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { ok: false, reason: "invalid" };
    return { ok: true, value: roundMoney(value) };
  }

  if (typeof value === "bigint") {
    return { ok: true, value: roundMoney(Number(value)) };
  }

  if (typeof value === "object" && value !== null && "toString" in value) {
    const asString = String((value as { toString: () => string }).toString()).trim();
    if (asString && asString !== "[object Object]") {
      return parseMoneyAmount(asString);
    }
    return { ok: false, reason: "invalid" };
  }

  if (typeof value !== "string") {
    return { ok: false, reason: "invalid" };
  }

  const trimmed = value.trim();
  if (!trimmed) return { ok: false, reason: "missing" };

  if (CANONICAL_DECIMAL.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return { ok: false, reason: "invalid" };
    return { ok: true, value: roundMoney(n) };
  }

  // Legacy display: "JOD 1,507.50" / "1,507.50"
  const withoutCurrency = trimmed.replace(LEGACY_CURRENCY, "").trim();
  const withoutGrouping = withoutCurrency.replace(/,/g, "");
  if (!CANONICAL_DECIMAL.test(withoutGrouping)) {
    return { ok: false, reason: "invalid" };
  }
  const legacy = Number(withoutGrouping);
  if (!Number.isFinite(legacy)) return { ok: false, reason: "invalid" };
  return { ok: true, value: roundMoney(legacy) };
}

export type MoneySumResult =
  | { ok: true; total: number; count: number }
  | { ok: false; invalidIndex: number; reason: "missing" | "invalid" };

/** Sum money values with explicit failure on the first invalid entry. */
export function sumMoneyAmounts(values: readonly unknown[]): MoneySumResult {
  let cents = 0;
  let count = 0;
  for (let i = 0; i < values.length; i += 1) {
    const parsed = parseMoneyAmount(values[i]);
    if (!parsed.ok) {
      return { ok: false, invalidIndex: i, reason: parsed.reason };
    }
    cents += Math.round(parsed.value * 100);
    count += 1;
  }
  return { ok: true, total: cents / 100, count };
}

/**
 * Display formatter for JOD amounts.
 * Uses en-US grouping for a stable LTR isolate (RTL pages wrap with `ew-ltr-isolate`).
 */
export function formatJodAmount(amount: number, locale = "en-US"): string {
  if (!Number.isFinite(amount)) {
    throw new Error("formatJodAmount requires a finite number");
  }
  const formatted = roundMoney(amount).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `JOD ${formatted}`;
}

/** Canonical API decimal string (no currency symbol, no grouping). */
export function toCanonicalMoneyString(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new Error("toCanonicalMoneyString requires a finite number");
  }
  return roundMoney(amount).toFixed(2);
}

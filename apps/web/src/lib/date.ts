import type { Locale } from "@/lib/i18n/types";

const API_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse YYYY-MM-DD as a local calendar date — never UTC midnight. */
export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const raw = value.slice(0, 10);
  const match = API_DATE_RE.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Format a local Date as YYYY-MM-DD for API payloads. */
export function toApiDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today as YYYY-MM-DD in the user's local calendar. */
export function todayApiDate(): string {
  return toApiDate(new Date());
}

/**
 * Convert a date-only field to ISO datetime at UTC noon.
 * Avoids day-shift bugs from `new Date('YYYY-MM-DD').toISOString()`.
 */
export function apiDateToIsoUtcNoon(value: string): string {
  const date = parseApiDate(value);
  if (!date) return value;
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
  ).toISOString();
}

export function formatDisplayDate(
  value: string | null | undefined,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseApiDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatDisplayDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  locale: Locale
): string {
  const a = formatDisplayDate(start, locale);
  const b = formatDisplayDate(end, locale);
  if (a === "—" && b === "—") return "—";
  if (b === "—") return a;
  if (a === "—") return b;
  return `${a} → ${b}`;
}

/** Format an ISO instant in the user's local timezone without date-only UTC coercion. */
export function formatDisplayDateTime(
  value: string | null | undefined,
  locale: Locale
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Safely format EntityAudit / timeline timestamps.
 * Formats raw ISO instants and YYYY-MM-DD values; leaves already-localized strings alone.
 */
export function formatEntityTimestamp(
  value: string | null | undefined,
  locale: Locale
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (ISO_INSTANT_RE.test(trimmed)) {
    const formatted = formatDisplayDateTime(trimmed, locale);
    return formatted === "—" ? undefined : formatted;
  }
  if (DATE_ONLY_RE.test(trimmed)) {
    const formatted = formatDisplayDate(trimmed, locale);
    return formatted === "—" ? undefined : formatted;
  }
  return trimmed;
}

/** Format an ISO datetime as a compact relative time string (e.g. "5m ago", "3d ago"). */
export function formatRelativeTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(-Math.round(diffSec), "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(-diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 30) return rtf.format(-diffDay, "day");
  const diffMonth = Math.round(diffDay / 30);
  if (Math.abs(diffMonth) < 12) return rtf.format(-diffMonth, "month");
  const diffYear = Math.round(diffMonth / 12);
  return rtf.format(-diffYear, "year");
}

export function isValidApiDate(value: string | null | undefined): boolean {
  return parseApiDate(value) !== null;
}

export function compareApiDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function clampApiDate(
  value: string,
  min?: string | null,
  max?: string | null
): string {
  let next = value;
  if (min && compareApiDates(next, min) < 0) next = min;
  if (max && compareApiDates(next, max) > 0) next = max;
  return next;
}

export function addMonthsLocal(date: Date, delta: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  const day = Math.min(
    date.getDate(),
    daysInMonth(next.getFullYear(), next.getMonth())
  );
  return new Date(next.getFullYear(), next.getMonth(), day);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

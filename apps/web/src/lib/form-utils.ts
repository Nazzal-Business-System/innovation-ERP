/**
 * Shared form-control geometry.
 *
 * Single-line controls use a fixed height + zero block padding + leading-none so
 * value and placeholder sit on the same vertical center across browsers.
 * Textareas intentionally avoid fixed height and use balanced block padding.
 */

export const TAX_RATE = 0.16;

export function parseMoney(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoneyAmount(amount: number): string {
  return `JOD ${amount.toFixed(2)}`;
}

export function calcOrderTotals(lines: Array<{ quantity: number; unitAmount: number }>) {
  const subtotal = Math.round(lines.reduce((s, l) => s + l.quantity * l.unitAmount, 0) * 100) / 100;
  const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
  return { subtotal, taxAmount, totalAmount };
}

export function newLineId(): string {
  return `line-${Math.random().toString(36).slice(2, 9)}`;
}

export type ControlSize = "sm" | "default" | "lg";

/** Shared surface / focus / disabled shell for all form controls. */
const controlSurface =
  "box-border w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] text-[var(--foreground)] transition-colors " +
  "hover:border-[var(--sidebar-active-border)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] " +
  "disabled:cursor-not-allowed disabled:opacity-60 " +
  "placeholder:text-[var(--muted)]";

/**
 * Height + horizontal padding + type size for single-line controls.
 * Block padding stays 0 — height alone centers the text/placeholder.
 */
export const controlSizeClass: Record<ControlSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  default: "h-10 px-3 text-sm",
  lg: "h-11 px-3.5 text-base",
};

/** Single-line input / native date / number / search field. */
export const inputClassName = [
  controlSurface,
  controlSizeClass.default,
  "py-0 leading-none",
  "placeholder:leading-none",
].join(" ");

/** Native <select> — same vertical metrics as inputs. */
export const selectClassName = [
  controlSurface,
  controlSizeClass.default,
  "cursor-pointer py-0 leading-none",
].join(" ");

/**
 * Multi-line textarea — never reuse inputClassName (avoids h-10 + top-stuck text).
 * Balanced block padding keeps the first line off the top edge.
 */
export const textareaClassName = [
  controlSurface,
  "min-h-[5.5rem] resize-y px-3 py-2.5 text-sm leading-6",
  "placeholder:leading-6",
].join(" ");

/** Button-style triggers (date picker, combobox) that should match input height. */
export const controlTriggerClassName = [
  inputClassName,
  "inline-flex items-center justify-between gap-2 text-start",
].join(" ");

export function inputClassNameForSize(size: ControlSize = "default"): string {
  return [
    controlSurface,
    controlSizeClass[size],
    "py-0 leading-none",
    "placeholder:leading-none",
  ].join(" ");
}

export function selectClassNameForSize(size: ControlSize = "default"): string {
  return [
    controlSurface,
    controlSizeClass[size],
    "cursor-pointer py-0 leading-none",
  ].join(" ");
}

import { z } from "zod";

const API_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse YYYY-MM-DD as UTC noon Date, or null if invalid. */
export function parseApiDateUtcNoon(value: string | null | undefined): Date | null {
  if (!value) return null;
  const raw = value.slice(0, 10);
  const match = API_DATE_RE.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function isValidApiDateString(value: string): boolean {
  return parseApiDateUtcNoon(value) !== null;
}

/** Zod helper: required YYYY-MM-DD calendar date. */
export const apiDateSchema = z
  .string()
  .trim()
  .refine(isValidApiDateString, { message: "Invalid date (expected YYYY-MM-DD)" });

/** Zod helper: nullable/optional clearable YYYY-MM-DD. */
export const apiDateNullableSchema = z
  .string()
  .trim()
  .nullable()
  .refine((v) => v === null || isValidApiDateString(v), {
    message: "Invalid date (expected YYYY-MM-DD)",
  });

export function toApiDateUtcNoon(value: string): Date {
  const date = parseApiDateUtcNoon(value);
  if (!date) {
    throw new Error("Invalid API date");
  }
  return date;
}

export function compareApiDateStrings(a: string, b: string): number {
  return a.slice(0, 10).localeCompare(b.slice(0, 10));
}

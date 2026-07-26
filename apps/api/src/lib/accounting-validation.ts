import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const accountsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]).optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const journalEntriesListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["DRAFT", "POSTED", "VOID"]).optional(),
});

export const trialBalanceSchema = z.object({
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]).optional(),
});

export const accountIdSchema = z.object({
  id: z.string().uuid("Invalid account id"),
});

export const journalEntryIdSchema = z.object({
  id: z.string().uuid("Invalid journal entry id"),
});

export const createJournalEntryLineSchema = z.object({
  accountId: z.string().uuid(),
  description: z.string().trim().optional(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
});

export const createJournalEntrySchema = z.object({
  entryDate: z.string().optional(),
  description: z.string().trim().min(1),
  sourceModule: z.string().trim().optional(),
  sourceReference: z.string().trim().optional(),
  lines: z.array(createJournalEntryLineSchema).min(2),
});

/** Safe COA edits only — code/type/normalBalance/parent are immutable via API. */
export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export function validateBalancedLines(
  lines: Array<{ debit: number; credit: number }>
): { valid: boolean; totalDebit: number; totalCredit: number } {
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const valid = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
  return { valid, totalDebit, totalCredit };
}

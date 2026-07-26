import { prisma } from "./prisma.js";
import { isRevenueAccountLine, REVENUE_ACCOUNT_CODE } from "./serialize-accounting.js";
import { currentMonthBounds, roundMoney } from "./metric-math.js";

export { isRevenueAccountLine };

/** Active CoA revenue tree: all REVENUE-type accounts (includes 4000 and any children). */
export async function resolveRevenueAccountCodes(orgId: string): Promise<string[]> {
  const accounts = await prisma.account.findMany({
    where: { organizationId: orgId, isActive: true, type: "REVENUE" },
    select: { code: true },
    orderBy: { code: "asc" },
  });
  if (accounts.length === 0) return [REVENUE_ACCOUNT_CODE];
  const codes = accounts.map((a) => a.code);
  if (!codes.includes(REVENUE_ACCOUNT_CODE)) {
    codes.unshift(REVENUE_ACCOUNT_CODE);
  }
  return codes;
}

/**
 * Dev diagnostic for executive Revenue MTD.
 * Posted-only; excludes DRAFT / VOID journals.
 */
export async function diagnosePostedRevenue(orgId: string, now = new Date()) {
  const period = currentMonthBounds(now);
  const revenueCodes = await resolveRevenueAccountCodes(orgId);

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      organizationId: orgId,
      journalEntry: {
        status: "POSTED",
        entryDate: { gte: period.start, lte: period.end },
      },
      OR: [
        { account: { type: "REVENUE" } },
        { account: { code: { in: revenueCodes } } },
      ],
    },
    select: {
      debit: true,
      credit: true,
      account: { select: { code: true, name: true, type: true } },
      journalEntry: {
        select: { entryNumber: true, entryDate: true, status: true, description: true },
      },
    },
  });

  let debitTotal = 0;
  let creditTotal = 0;
  const entryIds = new Set<string>();
  for (const line of lines) {
    debitTotal += Number(line.debit);
    creditTotal += Number(line.credit);
    entryIds.add(line.journalEntry.entryNumber);
  }

  const netRevenue = roundMoney(creditTotal - debitTotal);

  return {
    organizationId: orgId,
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    includedRevenueAccountCodes: revenueCodes,
    postedRevenueJournalCount: entryIds.size,
    postedRevenueLineCount: lines.length,
    debitTotal: roundMoney(debitTotal),
    creditTotal: roundMoney(creditTotal),
    calculatedNetRevenue: netRevenue,
    excludedJournalStatuses: ["DRAFT", "VOID"] as const,
    recognitionBasis:
      "Posted journal lines on REVENUE-type accounts (canonical code 4000). Invoice send posts revenue; delivery and customer payment do not.",
    lines: lines.map((l) => ({
      entryNumber: l.journalEntry.entryNumber,
      entryDate: l.journalEntry.entryDate.toISOString(),
      accountCode: l.account.code,
      debit: Number(l.debit),
      credit: Number(l.credit),
      description: l.journalEntry.description,
    })),
  };
}

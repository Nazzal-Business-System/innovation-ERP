import type { Prisma } from "@prisma/client";
import type {
  AccountType,
  AccountingAccount,
  AccountingAccountDetail,
  JournalEntry,
  JournalEntryDetail,
  JournalEntryLine,
  JournalEntryLineSummary,
  JournalEntryStatus,
  NormalBalance,
  TrialBalanceRow,
} from "@ierp/shared";

type AccountRecord = Prisma.AccountGetPayload<object>;

type JournalEntryWithRelations = Prisma.JournalEntryGetPayload<{
  include: {
    createdBy: true;
    lines: { include: { account: true } };
  };
}>;

type JournalEntrySummary = Prisma.JournalEntryGetPayload<{
  include: {
    createdBy: true;
    lines: true;
    _count: { select: { lines: true } };
  };
}>;

export function formatMoney(value: Prisma.Decimal | number): string {
  const num = typeof value === "number" ? value : Number(value);
  return `JOD ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function computeAccountBalance(
  account: { type: AccountType; normalBalance: NormalBalance },
  totalDebit: number,
  totalCredit: number
): number {
  if (account.normalBalance === "DEBIT") {
    return totalDebit - totalCredit;
  }
  return totalCredit - totalDebit;
}

export function sumEntryLines(lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>) {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    totalDebit += Number(line.debit);
    totalCredit += Number(line.credit);
  }
  return { totalDebit, totalCredit };
}

export function serializeAccount(account: AccountRecord, balance?: number): AccountingAccount {
  return {
    id: account.id,
    code: account.code,
    name: account.name,
    type: account.type as AccountType,
    normalBalance: account.normalBalance as NormalBalance,
    parentId: account.parentId,
    notes: account.notes ?? null,
    isActive: account.isActive,
    isProtected: account.isProtected,
    deactivatedAt: account.deactivatedAt?.toISOString() ?? null,
    reactivatedAt: account.reactivatedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    balance: balance !== undefined ? formatMoney(balance) : undefined,
  };
}

export function serializeJournalEntry(entry: JournalEntrySummary): JournalEntry {
  const { totalDebit, totalCredit } = sumEntryLines(entry.lines);
  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    entryDate: formatDate(entry.entryDate),
    description: entry.description,
    status: entry.status as JournalEntryStatus,
    sourceModule: entry.sourceModule,
    sourceReference: entry.sourceReference,
    totalDebit: formatMoney(totalDebit),
    totalCredit: formatMoney(totalCredit),
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    createdBy: entry.createdBy ? { id: entry.createdBy.id, name: entry.createdBy.name } : null,
    lineCount: entry._count?.lines ?? entry.lines.length,
  };
}

export function serializeJournalEntryDetail(entry: JournalEntryWithRelations): JournalEntryDetail {
  const base = serializeJournalEntry({
    ...entry,
    _count: { lines: entry.lines.length },
  });
  const { totalDebit, totalCredit } = sumEntryLines(entry.lines);
  return {
    ...base,
    lines: entry.lines.map((line) => ({
      id: line.id,
      accountId: line.accountId,
      accountCode: line.account.code,
      accountName: line.account.name,
      accountType: line.account.type as AccountType,
      description: line.description,
      debit: formatMoney(line.debit),
      credit: formatMoney(line.credit),
    })),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    canPost:
      entry.status === "DRAFT" &&
      Math.abs(totalDebit - totalCredit) < 0.01 &&
      totalDebit > 0,
  };
}

export function serializeLineSummary(
  line: Prisma.JournalEntryLineGetPayload<{
    include: {
      account: true;
      journalEntry: true;
    };
  }>
): JournalEntryLineSummary {
  return {
    id: line.id,
    description: line.description,
    debit: formatMoney(line.debit),
    credit: formatMoney(line.credit),
    account: { id: line.account.id, code: line.account.code, name: line.account.name },
    entryId: line.journalEntry.id,
    entryNumber: line.journalEntry.entryNumber,
    entryDate: formatDate(line.journalEntry.entryDate),
    entryStatus: line.journalEntry.status as JournalEntryStatus,
  };
}

export function buildTrialBalanceRow(
  account: AccountRecord,
  totalDebit: number,
  totalCredit: number
): TrialBalanceRow {
  const ending = computeAccountBalance(
    { type: account.type as AccountType, normalBalance: account.normalBalance as NormalBalance },
    totalDebit,
    totalCredit
  );
  return {
    accountId: account.id,
    code: account.code,
    name: account.name,
    type: account.type as AccountType,
    normalBalance: account.normalBalance as NormalBalance,
    totalDebit: formatMoney(totalDebit),
    totalCredit: formatMoney(totalCredit),
    endingBalance: formatMoney(ending),
  };
}

export const AR_ACCOUNT_CODE = "1100";
export const AP_ACCOUNT_CODE = "2000";
export const REVENUE_ACCOUNT_CODE = "4000";

export const EXPENSE_ACCOUNT_CODES = ["5000", "6100", "6200", "6300", "6400", "6500"];

/** Revenue CoA tree: REVENUE-type accounts, plus canonical code 4000. */
export function isRevenueAccountLine(account: { code: string; type: string }): boolean {
  return account.type === "REVENUE" || account.code === REVENUE_ACCOUNT_CODE;
}

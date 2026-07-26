import type { MasterDataLifecycle } from "./master-data";

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type NormalBalance = "DEBIT" | "CREDIT";
export type JournalEntryStatus = "DRAFT" | "POSTED" | "VOID";

export interface AccountingAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentId: string | null;
  notes: string | null;
  isActive: boolean;
  isProtected: boolean;
  deactivatedAt: string | null;
  reactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  balance?: string;
}

export interface AccountingAccountDetail extends AccountingAccount, MasterDataLifecycle {
  recentLines: JournalEntryLineSummary[];
  hasPostedActivity?: boolean;
}

/** Safe account profile edits — never code/type/normalBalance/parent. */
export interface UpdateAccountInput {
  name?: string;
  notes?: string | null;
}

export interface JournalEntryLineSummary {
  id: string;
  description: string | null;
  debit: string;
  credit: string;
  account: { id: string; code: string; name: string };
  entryId: string;
  entryNumber: string;
  entryDate: string;
  entryStatus: JournalEntryStatus;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  description: string | null;
  debit: string;
  credit: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  status: JournalEntryStatus;
  sourceModule: string | null;
  sourceReference: string | null;
  totalDebit: string;
  totalCredit: string;
  isBalanced: boolean;
  createdBy: { id: string; name: string } | null;
  lineCount?: number;
}

export interface JournalEntryDetail extends JournalEntry {
  lines: JournalEntryLine[];
  createdAt?: string;
  updatedAt?: string;
  canPost?: boolean;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  totalDebit: string;
  totalCredit: string;
  endingBalance: string;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totals: {
    totalDebit: string;
    totalCredit: string;
    isBalanced: boolean;
  };
}

export interface AccountingOverview {
  periodLabel?: string;
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  monthlyRevenue: string;
  monthlyExpenses: string;
  netProfit: string;
  accountsReceivable: string;
  accountsPayable: string;
  recentJournalEntries: JournalEntry[];
  expenseBreakdown: Array<{ accountCode: string; accountName: string; amount: string }>;
  revenueTrend: Array<{ month: string; revenue: string; expenses: string }>;
}

export const ACCOUNTING_PERMISSIONS = {
  READ: "accounting.read",
  WRITE: "accounting.write",
} as const;

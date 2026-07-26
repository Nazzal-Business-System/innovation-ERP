import type { AccountType } from "@prisma/client";
import { prisma } from "./prisma.js";
import {
  computeAccountBalance,
  EXPENSE_ACCOUNT_CODES,
  formatMoney,
  isRevenueAccountLine,
  REVENUE_ACCOUNT_CODE,
} from "./serialize-accounting.js";
import {
  currentMonthBounds,
  inventoryValuationFromRows,
  localMonthKey,
  roundMoney,
} from "./metric-math.js";

export async function getPostedAccountTotals(orgId: string) {
  const [grouped, accounts] = await Promise.all([
    prisma.journalEntryLine.groupBy({
      by: ["accountId"],
      where: {
        organizationId: orgId,
        journalEntry: { status: "POSTED" },
      },
      _sum: { debit: true, credit: true },
    }),
    prisma.account.findMany({
      where: { organizationId: orgId, isActive: true },
    }),
  ]);

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const totals = new Map<
    string,
    { debit: number; credit: number; account: (typeof accounts)[0] }
  >();

  for (const row of grouped) {
    const account = accountById.get(row.accountId);
    if (!account) continue;
    totals.set(row.accountId, {
      debit: Number(row._sum.debit ?? 0),
      credit: Number(row._sum.credit ?? 0),
      account,
    });
  }
  return { totals, accounts };
}

/**
 * Posted-only financial metrics.
 * - Balance sheet: all-time posted active accounts
 * - P&L revenue: posted lines on REVENUE-type CoA accounts (tree rooted at Sales Revenue / type REVENUE)
 * - P&L expenses: EXPENSE type or configured expense codes
 * - Period: current local calendar month
 * - revenueTrend: last 6 local months
 */
export async function computeFinancialMetrics(orgId: string, now = new Date()) {
  const { start: monthStart, end: monthEnd, label: periodLabel, priorStart, priorEnd } =
    currentMonthBounds(now);

  const [{ totals, accounts }, plLines] = await Promise.all([
    getPostedAccountTotals(orgId),
    prisma.journalEntryLine.findMany({
      where: {
        organizationId: orgId,
        journalEntry: { status: "POSTED" },
        OR: [
          { account: { type: "REVENUE" } },
          { account: { code: REVENUE_ACCOUNT_CODE } },
          { account: { type: "EXPENSE" } },
          { account: { code: { in: [...EXPENSE_ACCOUNT_CODES] } } },
        ],
      },
      select: {
        debit: true,
        credit: true,
        account: { select: { code: true, name: true, type: true } },
        journalEntry: { select: { entryDate: true } },
      },
    }),
  ]);

  let assets = 0;
  let liabilities = 0;
  let equity = 0;
  let revenue = 0;
  let expenses = 0;
  let priorRevenue = 0;
  let priorExpenses = 0;
  let sumDebit = 0;
  let sumCredit = 0;
  const expenseMap = new Map<string, { code: string; name: string; amount: number }>();
  const monthBuckets = new Map<string, { revenue: number; expenses: number }>();

  for (const account of accounts) {
    const t = totals.get(account.id);
    if (!t) continue;
    sumDebit += t.debit;
    sumCredit += t.credit;
    const balance = computeAccountBalance(
      { type: account.type as AccountType, normalBalance: account.normalBalance as "DEBIT" | "CREDIT" },
      t.debit,
      t.credit
    );
    if (account.type === "ASSET") assets += balance;
    if (account.type === "LIABILITY") liabilities += balance;
    if (account.type === "EQUITY") equity += balance;
  }

  for (const line of plLines) {
    const entryDate = line.journalEntry.entryDate;
    const entryMonth = localMonthKey(entryDate);
    if (!monthBuckets.has(entryMonth)) {
      monthBuckets.set(entryMonth, { revenue: 0, expenses: 0 });
    }
    const bucket = monthBuckets.get(entryMonth)!;
    const inCurrentMonth = entryDate >= monthStart && entryDate <= monthEnd;
    const inPriorMonth = entryDate >= priorStart && entryDate <= priorEnd;
    const debit = Number(line.debit);
    const credit = Number(line.credit);

    if (isRevenueAccountLine(line.account)) {
      const amount = credit - debit;
      bucket.revenue += amount;
      if (inCurrentMonth) revenue += amount;
      if (inPriorMonth) priorRevenue += amount;
    }
    if (EXPENSE_ACCOUNT_CODES.includes(line.account.code) || line.account.type === "EXPENSE") {
      const amount = debit - credit;
      bucket.expenses += amount;
      if (inCurrentMonth) {
        expenses += amount;
        const existing = expenseMap.get(line.account.code) ?? {
          code: line.account.code,
          name: line.account.name,
          amount: 0,
        };
        existing.amount += amount;
        expenseMap.set(line.account.code, existing);
      }
      if (inPriorMonth) priorExpenses += amount;
    }
  }

  revenue = roundMoney(revenue);
  expenses = roundMoney(expenses);
  priorRevenue = roundMoney(priorRevenue);
  priorExpenses = roundMoney(priorExpenses);
  const netProfit = roundMoney(revenue - expenses);
  const priorNetProfit = roundMoney(priorRevenue - priorExpenses);

  const revenueTrend = Array.from(monthBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({
      label: month,
      value: roundMoney(data.revenue),
      secondary: roundMoney(data.expenses),
    }));

  return {
    periodLabel,
    assets: roundMoney(assets),
    liabilities: roundMoney(liabilities),
    equity: roundMoney(equity),
    revenue,
    expenses,
    netProfit,
    priorRevenue,
    priorExpenses,
    priorNetProfit,
    trialBalanceStatus: {
      isBalanced: Math.abs(sumDebit - sumCredit) < 0.01,
      totalDebit: formatMoney(sumDebit),
      totalCredit: formatMoney(sumCredit),
    },
    expenseBreakdown: Array.from(expenseMap.values())
      .filter((e) => e.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .map((e) => ({
        accountCode: e.code,
        accountName: e.name,
        amount: formatMoney(e.amount),
      })),
    revenueTrend,
  };
}

/**
 * On-hand inventory valuation for active products only:
 * Σ (quantityOnHand × costPrice). Excludes DRAFT / DISCONTINUED / archived.
 */
export async function computeInventoryValuation(orgId: string) {
  const balances = await prisma.stockBalance.findMany({
    where: {
      organizationId: orgId,
      product: { isArchived: false, status: "ACTIVE" },
    },
    include: {
      product: { select: { costPrice: true } },
    },
  });

  const rows = balances.map((b) => ({
    quantityOnHand: b.quantityOnHand,
    unitCost: Number(b.product.costPrice),
  }));
  const totalUnits = rows.reduce((s, r) => s + r.quantityOnHand, 0);
  return {
    totalUnits,
    totalInventoryValue: inventoryValuationFromRows(rows),
  };
}

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

const ACCOUNT_CODES = {
  CASH: "1000",
  BANK: "1010",
  AR: "1100",
  INVENTORY: "1200",
  AP: "2000",
  VAT: "2100",
  REVENUE: "4000",
  SALARIES_EXPENSE: "6100",
} as const;

type TxClient = Prisma.TransactionClient;

async function getAccountByCode(tx: TxClient, orgId: string, code: string) {
  return tx.account.findFirst({
    where: { organizationId: orgId, code, isActive: true },
  });
}

async function nextEntryNumber(tx: TxClient, orgId: string) {
  const count = await tx.journalEntry.count({ where: { organizationId: orgId } });
  return `JE-2026-${String(count + 1).padStart(4, "0")}`;
}

export async function postBalancedJournalEntry(
  tx: TxClient,
  params: {
    orgId: string;
    userId: string;
    entryDate: Date;
    description: string;
    sourceModule: string;
    sourceReference: string;
    lines: Array<{ code: string; debit?: number; credit?: number; description?: string }>;
  }
) {
  const accounts = await Promise.all(
    params.lines.map((l) => getAccountByCode(tx, params.orgId, l.code))
  );

  if (accounts.some((a) => !a)) return null;

  let totalDebit = 0;
  let totalCredit = 0;
  const lineData = params.lines.map((line, i) => {
    const debit = line.debit ?? 0;
    const credit = line.credit ?? 0;
    totalDebit += debit;
    totalCredit += credit;
    return {
      organizationId: params.orgId,
      accountId: accounts[i]!.id,
      description: line.description ?? null,
      debit,
      credit,
    };
  });

  if (Math.abs(totalDebit - totalCredit) > 0.01) return null;

  const entryNumber = await nextEntryNumber(tx, params.orgId);

  return tx.journalEntry.create({
    data: {
      organizationId: params.orgId,
      entryNumber,
      entryDate: params.entryDate,
      description: params.description,
      status: "POSTED",
      sourceModule: params.sourceModule,
      sourceReference: params.sourceReference,
      createdById: params.userId,
      lines: { create: lineData },
    },
  });
}

export async function postInvoiceSentJournal(
  tx: TxClient,
  orgId: string,
  userId: string,
  invoiceNumber: string,
  invoiceDate: Date,
  subtotal: number,
  taxAmount: number,
  totalAmount: number
) {
  return postBalancedJournalEntry(tx, {
    orgId,
    userId,
    entryDate: invoiceDate,
    description: `Customer invoice ${invoiceNumber} sent`,
    sourceModule: "finance",
    sourceReference: invoiceNumber,
    lines: [
      { code: ACCOUNT_CODES.AR, debit: totalAmount, description: "Accounts receivable" },
      { code: ACCOUNT_CODES.REVENUE, credit: subtotal, description: "Sales revenue" },
      { code: ACCOUNT_CODES.VAT, credit: taxAmount, description: "VAT payable" },
    ],
  });
}

export async function postCustomerPaymentJournal(
  tx: TxClient,
  orgId: string,
  userId: string,
  paymentNumber: string,
  paymentDate: Date,
  amount: number,
  method: string
) {
  const cashAccount = method === "CASH" ? ACCOUNT_CODES.CASH : ACCOUNT_CODES.BANK;
  return postBalancedJournalEntry(tx, {
    orgId,
    userId,
    entryDate: paymentDate,
    description: `Customer payment ${paymentNumber}`,
    sourceModule: "finance",
    sourceReference: paymentNumber,
    lines: [
      { code: cashAccount, debit: amount, description: "Cash/Bank receipt" },
      { code: ACCOUNT_CODES.AR, credit: amount, description: "AR reduction" },
    ],
  });
}

export async function postVendorBillReceivedJournal(
  tx: TxClient,
  orgId: string,
  userId: string,
  billNumber: string,
  billDate: Date,
  subtotal: number,
  taxAmount: number,
  totalAmount: number
) {
  return postBalancedJournalEntry(tx, {
    orgId,
    userId,
    entryDate: billDate,
    description: `Vendor bill ${billNumber} received`,
    sourceModule: "finance",
    sourceReference: billNumber,
    lines: [
      { code: ACCOUNT_CODES.INVENTORY, debit: subtotal, description: "Inventory/expense" },
      { code: ACCOUNT_CODES.VAT, debit: taxAmount, description: "VAT input" },
      { code: ACCOUNT_CODES.AP, credit: totalAmount, description: "Accounts payable" },
    ],
  });
}

export async function postVendorPaymentJournal(
  tx: TxClient,
  orgId: string,
  userId: string,
  paymentNumber: string,
  paymentDate: Date,
  amount: number,
  method: string
) {
  const cashAccount = method === "CASH" ? ACCOUNT_CODES.CASH : ACCOUNT_CODES.BANK;
  return postBalancedJournalEntry(tx, {
    orgId,
    userId,
    entryDate: paymentDate,
    description: `Vendor payment ${paymentNumber}`,
    sourceModule: "finance",
    sourceReference: paymentNumber,
    lines: [
      { code: ACCOUNT_CODES.AP, debit: amount, description: "AP reduction" },
      { code: cashAccount, credit: amount, description: "Cash/Bank disbursement" },
    ],
  });
}

/**
 * Payroll settlement (cash-basis): recognize salaries expense when paying.
 * Process Payroll does not post journals — keep that behavior unchanged.
 * Dr Salaries Expense (6100) / Cr Bank (1010) for the paid net total.
 */
export async function postPayrollPaymentJournal(
  tx: TxClient,
  orgId: string,
  userId: string,
  params: {
    runNumber: string;
    paymentDate: Date;
    amount: number;
    employeeCount: number;
    sourceReference: string;
  }
) {
  return postBalancedJournalEntry(tx, {
    orgId,
    userId,
    entryDate: params.paymentDate,
    description: `Payroll payment ${params.runNumber} (${params.employeeCount} employee${params.employeeCount === 1 ? "" : "s"})`,
    sourceModule: "hr",
    sourceReference: params.sourceReference,
    lines: [
      {
        code: ACCOUNT_CODES.SALARIES_EXPENSE,
        debit: params.amount,
        description: "Salaries expense",
      },
      {
        code: ACCOUNT_CODES.BANK,
        credit: params.amount,
        description: "Bank disbursement",
      },
    ],
  });
}

export function resolveEffectiveInvoiceStatus(
  status: string,
  dueDate: Date,
  amountPaid: number,
  totalAmount: number
): string {
  if (status === "VOID" || status === "DRAFT" || status === "PAID") return status;
  const balance = Number(totalAmount) - Number(amountPaid);
  if (balance <= 0) return "PAID";
  if (Number(amountPaid) > 0) {
    if (dueDate < new Date(new Date().toISOString().slice(0, 10)) && status !== "OVERDUE") {
      return "OVERDUE";
    }
    return "PARTIALLY_PAID";
  }
  if (
    (status === "SENT" || status === "PARTIALLY_PAID" || status === "OVERDUE") &&
    dueDate < new Date(new Date().toISOString().slice(0, 10))
  ) {
    return "OVERDUE";
  }
  return status;
}

export function resolveEffectiveBillStatus(
  status: string,
  dueDate: Date,
  amountPaid: number,
  totalAmount: number
): string {
  if (status === "VOID" || status === "DRAFT" || status === "PAID") return status;
  const balance = Number(totalAmount) - Number(amountPaid);
  if (balance <= 0) return "PAID";
  if (Number(amountPaid) > 0) {
    if (dueDate < new Date(new Date().toISOString().slice(0, 10))) return "OVERDUE";
    return "PARTIALLY_PAID";
  }
  if (
    (status === "RECEIVED" || status === "PARTIALLY_PAID" || status === "OVERDUE") &&
    dueDate < new Date(new Date().toISOString().slice(0, 10))
  ) {
    return "OVERDUE";
  }
  return status;
}

export async function ensureFinanceAccounts(orgId: string) {
  const ar = await prisma.account.findFirst({
    where: { organizationId: orgId, code: ACCOUNT_CODES.AR, isActive: true },
  });
  return Boolean(ar);
}

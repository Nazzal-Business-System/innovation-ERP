import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { postPayrollPaymentJournal } from "./finance-journal.js";
import { logMasterDataEvent } from "./master-data-audit.js";

type TxClient = Prisma.TransactionClient;

export class PayrollPaymentError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "PayrollPaymentError";
  }
}

export const payrollDetailInclude = {
  processedBy: true,
  lines: {
    include: {
      employee: { include: { department: true } },
      paidBy: true,
    },
    orderBy: { employee: { lastName: "asc" as const } },
  },
} as const;

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

type PayCommitResult = {
  runId: string;
  organizationId: string;
  userId: string;
  nextStatus: "PAID" | "PARTIALLY_PAID" | "PROCESSED";
  paidLineCount: number;
  journalEntryId: string;
  journalEntryNumber: string;
  auditSummary: string;
};

/**
 * Atomic payment body — only claim lines, post journal, mark paid, update run status.
 * Does NOT load full detail includes or write audit logs (those run after commit).
 */
async function payPayrollLinesInTransaction(
  tx: TxClient,
  params: {
    orgId: string;
    userId: string;
    runId: string;
    lineIds: string[];
  }
): Promise<PayCommitResult> {
  const { orgId, userId, runId, lineIds } = params;
  const uniqueIds = [...new Set(lineIds)];
  if (uniqueIds.length === 0) {
    throw new PayrollPaymentError(400, "No unpaid lines selected");
  }

  const run = await tx.payrollRun.findFirst({
    where: { id: runId, organizationId: orgId },
    select: { id: true, status: true, runNumber: true },
  });
  if (!run) {
    throw new PayrollPaymentError(404, "Payroll run not found");
  }
  if (run.status !== "PROCESSED" && run.status !== "PARTIALLY_PAID") {
    throw new PayrollPaymentError(400, "Payroll must be processed before payment");
  }

  const lines = await tx.payrollLine.findMany({
    where: {
      id: { in: uniqueIds },
      payrollRunId: runId,
      organizationId: orgId,
    },
    select: { id: true, status: true, netPay: true },
  });

  if (lines.length !== uniqueIds.length) {
    throw new PayrollPaymentError(400, "One or more selected lines do not belong to this payroll run");
  }

  const alreadyPaid = lines.filter((l) => l.status === "PAID");
  if (alreadyPaid.length > 0) {
    throw new PayrollPaymentError(409, "Employee already paid");
  }

  const unpaid = lines.filter((l) => l.status === "PROCESSED");
  if (unpaid.length === 0) {
    throw new PayrollPaymentError(400, "No unpaid lines selected");
  }
  if (unpaid.length !== lines.length) {
    throw new PayrollPaymentError(400, "Only processed unpaid lines can be paid");
  }

  const amount = roundMoney(unpaid.reduce((sum, l) => sum + Number(l.netPay), 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    for (const line of unpaid) {
      const net = Number(line.netPay);
      if (!Number.isFinite(net) || net <= 0) {
        console.error(`[payroll] invalid netPay on line ${line.id}`);
      }
    }
    throw new PayrollPaymentError(400, "One or more payroll lines have an invalid net pay amount");
  }

  const paidAt = new Date();
  const sourceReference = `${run.runNumber}:${unpaid
    .map((l) => l.id)
    .sort()
    .join(",")
    .slice(0, 180)}`;

  const journal = await postPayrollPaymentJournal(tx, orgId, userId, {
    runNumber: run.runNumber,
    paymentDate: paidAt,
    amount,
    employeeCount: unpaid.length,
    sourceReference,
  });

  if (!journal) {
    throw new PayrollPaymentError(
      400,
      "Accounting posting failed. Ensure Salaries Expense (6100) and Bank (1010) accounts exist."
    );
  }

  const unpaidIds = unpaid.map((l) => l.id);
  const updated = await tx.payrollLine.updateMany({
    where: {
      id: { in: unpaidIds },
      payrollRunId: runId,
      organizationId: orgId,
      status: "PROCESSED",
    },
    data: {
      status: "PAID",
      paidAt,
      paidById: userId,
      paymentReference: journal.entryNumber,
      paymentJournalEntryId: journal.id,
    },
  });

  if (updated.count !== unpaidIds.length) {
    throw new PayrollPaymentError(409, "Duplicate payment request. Refresh and try again.");
  }

  const [remainingUnpaid, paidCount] = await Promise.all([
    tx.payrollLine.count({
      where: { payrollRunId: runId, organizationId: orgId, status: "PROCESSED" },
    }),
    tx.payrollLine.count({
      where: { payrollRunId: runId, organizationId: orgId, status: "PAID" },
    }),
  ]);

  const nextStatus: PayCommitResult["nextStatus"] =
    remainingUnpaid === 0 ? "PAID" : paidCount > 0 ? "PARTIALLY_PAID" : "PROCESSED";

  // Status-only update — full detail include happens after commit with the root client.
  await tx.payrollRun.update({
    where: { id: runId },
    data: { status: nextStatus },
  });

  return {
    runId,
    organizationId: orgId,
    userId,
    nextStatus,
    paidLineCount: unpaid.length,
    journalEntryId: journal.id,
    journalEntryNumber: journal.entryNumber,
    auditSummary:
      nextStatus === "PAID"
        ? `Payroll fully paid (${unpaid.length} employee${unpaid.length === 1 ? "" : "s"})`
        : `Payroll partial payment (${unpaid.length} employee${unpaid.length === 1 ? "" : "s"})`,
  };
}

export async function resolvePayrollPayLineIds(
  db: TxClient | typeof prisma,
  params: {
    orgId: string;
    runId: string;
    mode: "allRemaining" | "department" | "employees" | "lines";
    departmentId?: string;
    employeeIds?: string[];
    lineIds?: string[];
  }
): Promise<string[]> {
  const { orgId, runId, mode, departmentId, employeeIds, lineIds } = params;

  if (mode === "allRemaining") {
    const lines = await db.payrollLine.findMany({
      where: { payrollRunId: runId, organizationId: orgId, status: "PROCESSED" },
      select: { id: true },
    });
    return lines.map((l) => l.id);
  }

  if (mode === "department") {
    if (!departmentId) {
      throw new PayrollPaymentError(400, "Department is required");
    }
    const dept = await db.department.findFirst({
      where: { id: departmentId, organizationId: orgId },
      select: { id: true },
    });
    if (!dept) {
      throw new PayrollPaymentError(400, "Invalid department");
    }
    const lines = await db.payrollLine.findMany({
      where: {
        payrollRunId: runId,
        organizationId: orgId,
        status: "PROCESSED",
        employee: { departmentId },
      },
      select: { id: true },
    });
    return lines.map((l) => l.id);
  }

  if (mode === "lines") {
    const ids = [...new Set(lineIds ?? [])];
    if (ids.length === 0) {
      throw new PayrollPaymentError(400, "No unpaid lines selected");
    }
    return ids;
  }

  const ids = [...new Set(employeeIds ?? [])];
  if (ids.length === 0) {
    throw new PayrollPaymentError(400, "No unpaid lines selected");
  }

  const lines = await db.payrollLine.findMany({
    where: {
      payrollRunId: runId,
      organizationId: orgId,
      employeeId: { in: ids },
    },
    select: { id: true, status: true, employeeId: true },
  });

  if (lines.length !== ids.length) {
    throw new PayrollPaymentError(400, "One or more selected employees are not on this payroll run");
  }

  return lines.map((l) => l.id);
}

async function loadPayrollRunDetail(orgId: string, runId: string) {
  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, organizationId: orgId },
    include: payrollDetailInclude,
  });
  if (!run) {
    throw new PayrollPaymentError(404, "Payroll run not found");
  }
  return run;
}

/**
 * Own the payment transaction boundary:
 * 1) Commit atomic financial updates with a short-lived interactive transaction
 * 2) Audit with the root Prisma client after commit (never reuse a closed tx)
 * 3) Load the full detail payload after commit for the API response
 */
export async function executePayrollPayment(params: {
  orgId: string;
  userId: string;
  runId: string;
  mode: "allRemaining" | "department" | "employees" | "lines";
  departmentId?: string;
  employeeIds?: string[];
  lineIds?: string[];
}) {
  const committed = await prisma.$transaction(async (tx) => {
    const lineIds = await resolvePayrollPayLineIds(tx, {
      orgId: params.orgId,
      runId: params.runId,
      mode: params.mode,
      departmentId: params.departmentId,
      employeeIds: params.employeeIds,
      lineIds: params.lineIds,
    });
    return payPayrollLinesInTransaction(tx, {
      orgId: params.orgId,
      userId: params.userId,
      runId: params.runId,
      lineIds,
    });
  });

  // Pattern B: audit after successful commit using the root client.
  try {
    await logMasterDataEvent(prisma, {
      organizationId: committed.organizationId,
      userId: committed.userId,
      entity: "PayrollRun",
      entityId: committed.runId,
      action: "paid",
      summary: committed.auditSummary,
      fields: ["status", "paidAt", "paymentJournalEntryId"],
    });
  } catch (err) {
    console.error(
      `[payroll] audit failed after payment commit run=${committed.runId} journal=${committed.journalEntryNumber}`,
      err instanceof Error ? err.message : err
    );
  }

  return loadPayrollRunDetail(committed.organizationId, committed.runId);
}

/** Single-line convenience wrapper. */
export async function executePayrollLinePayment(params: {
  orgId: string;
  userId: string;
  runId: string;
  lineId: string;
}) {
  return executePayrollPayment({
    orgId: params.orgId,
    userId: params.userId,
    runId: params.runId,
    mode: "lines",
    lineIds: [params.lineId],
  });
}

import { Router } from "express";
import { ACCOUNTING_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  changedFields,
  getMasterDataLifecycle,
  logMasterDataEvent,
} from "../lib/master-data-audit.js";
import { setLifecycleSchema } from "../lib/master-data-validation.js";
import {
  accountsListSchema,
  accountIdSchema,
  createJournalEntrySchema,
  journalEntriesListSchema,
  journalEntryIdSchema,
  trialBalanceSchema,
  updateAccountSchema,
  validateBalancedLines,
} from "../lib/accounting-validation.js";
import { computeFinancialMetrics, getPostedAccountTotals } from "../lib/financial-metrics.js";
import {
  AP_ACCOUNT_CODE,
  AR_ACCOUNT_CODE,
  buildTrialBalanceRow,
  computeAccountBalance,
  formatMoney,
  serializeAccount,
  serializeJournalEntry,
  serializeJournalEntryDetail,
  serializeLineSummary,
  sumEntryLines,
} from "../lib/serialize-accounting.js";
import type { AccountType } from "@ierp/shared";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

const entryInclude = {
  createdBy: true,
  lines: { include: { account: true }, orderBy: { createdAt: "asc" as const } },
};

const entrySummaryInclude = {
  createdBy: true,
  lines: true,
  _count: { select: { lines: true } },
};

async function loadAccountDetail(orgId: string, accountId: string) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, organizationId: orgId },
  });
  if (!account) return null;

  const [{ totals: postedTotals }, recentLines, lifecycle] = await Promise.all([
    getPostedAccountTotals(orgId),
    prisma.journalEntryLine.findMany({
      where: { organizationId: orgId, accountId: account.id },
      include: { account: true, journalEntry: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    getMasterDataLifecycle(prisma, {
      organizationId: orgId,
      entity: "Account",
      entityId: account.id,
      metadata: {
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        deactivatedAt: account.deactivatedAt,
        reactivatedAt: account.reactivatedAt,
      },
    }),
  ]);

  const t = postedTotals.get(account.id);
  const balance = t
    ? computeAccountBalance(
        { type: account.type as AccountType, normalBalance: account.normalBalance as "DEBIT" | "CREDIT" },
        t.debit,
        t.credit
      )
    : 0;

  return {
    ...serializeAccount(account, balance),
    recentLines: recentLines.map(serializeLineSummary),
    hasPostedActivity: Boolean(t && (t.debit > 0 || t.credit > 0)),
    ...lifecycle,
  };
}

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(ACCOUNTING_PERMISSIONS.READ));

router.get(
  "/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;

    const [financial, { totals: postedTotals, accounts }, recentEntries] = await Promise.all([
      computeFinancialMetrics(orgId),
      getPostedAccountTotals(orgId),
      prisma.journalEntry.findMany({
        where: { organizationId: orgId },
        include: entrySummaryInclude,
        orderBy: { entryDate: "desc" },
        take: 8,
      }),
    ]);

    let accountsReceivable = 0;
    let accountsPayable = 0;
    for (const account of accounts) {
      const t = postedTotals.get(account.id);
      if (!t) continue;
      const balance = computeAccountBalance(
        { type: account.type as AccountType, normalBalance: account.normalBalance as "DEBIT" | "CREDIT" },
        t.debit,
        t.credit
      );
      if (account.code === AR_ACCOUNT_CODE) accountsReceivable = balance;
      if (account.code === AP_ACCOUNT_CODE) accountsPayable = balance;
    }

    res.json({
      periodLabel: financial.periodLabel,
      totalAssets: formatMoney(financial.assets),
      totalLiabilities: formatMoney(financial.liabilities),
      totalEquity: formatMoney(financial.equity),
      monthlyRevenue: formatMoney(financial.revenue),
      monthlyExpenses: formatMoney(financial.expenses),
      netProfit: formatMoney(financial.netProfit),
      accountsReceivable: formatMoney(accountsReceivable),
      accountsPayable: formatMoney(accountsPayable),
      recentJournalEntries: recentEntries.map(serializeJournalEntry),
      expenseBreakdown: financial.expenseBreakdown,
      revenueTrend: financial.revenueTrend.map((row) => ({
        month: row.label,
        revenue: formatMoney(row.value),
        expenses: formatMoney(row.secondary ?? 0),
      })),
    });
  })
);

router.get(
  "/accounts",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = accountsListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, type, active } = parsed.data;
    const skip = (page - 1) * limit;
    const where = {
      organizationId: orgId,
      ...(type ? { type } : {}),
      ...(active !== undefined ? { isActive: active } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [accounts, total, postedTotals] = await Promise.all([
      prisma.account.findMany({
        where,
        orderBy: [{ code: "asc" }],
        skip,
        take: limit,
      }),
      prisma.account.count({ where }),
      getPostedAccountTotals(orgId),
    ]);

    res.json({
      data: accounts.map((a) => {
        const t = postedTotals.totals.get(a.id);
        const balance = t
          ? computeAccountBalance(
              { type: a.type as AccountType, normalBalance: a.normalBalance as "DEBIT" | "CREDIT" },
              t.debit,
              t.credit
            )
          : 0;
        return serializeAccount(a, balance);
      }),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/accounts/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = accountIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid account id" });
      return;
    }

    const detail = await loadAccountDetail(orgId, parsed.data.id);
    if (!detail) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    res.json(detail);
  })
);

router.patch(
  "/accounts/:id",
  requirePermission(ACCOUNTING_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = accountIdSchema.safeParse(req.params);
    const bodyParsed = updateAccountSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.account.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const body = bodyParsed.data;
    const { profile, notesChanged } = changedFields(body);

    await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        },
      });

      if (profile.length > 0) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Account",
          entityId: existing.id,
          action: "details_updated",
          summary: "Account details updated",
          fields: profile,
        });
      }
      if (notesChanged) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Account",
          entityId: existing.id,
          action: "notes_updated",
          summary: "Account notes updated",
          fields: ["notes"],
        });
      }
    });

    const detail = await loadAccountDetail(orgId, existing.id);
    res.json(detail);
  })
);

router.patch(
  "/accounts/:id/lifecycle",
  requirePermission(ACCOUNTING_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = accountIdSchema.safeParse(req.params);
    const bodyParsed = setLifecycleSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.account.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const { active } = bodyParsed.data;
    if (existing.isActive === active) {
      const detail = await loadAccountDetail(orgId, existing.id);
      res.json(detail);
      return;
    }

    if (!active) {
      if (existing.isProtected) {
        res.status(409).json({
          error: "Protected accounts cannot be deactivated",
          code: "ACCOUNT_PROTECTED",
        });
        return;
      }

      const postedLine = await prisma.journalEntryLine.findFirst({
        where: {
          organizationId: orgId,
          accountId: existing.id,
          journalEntry: { status: "POSTED" },
        },
        select: { id: true },
      });
      if (postedLine) {
        res.status(409).json({
          error: "Cannot deactivate an account with posted journal activity",
          code: "ACCOUNT_HAS_POSTED_ACTIVITY",
        });
        return;
      }

      const activeChildren = await prisma.account.count({
        where: { organizationId: orgId, parentId: existing.id, isActive: true },
      });
      if (activeChildren > 0) {
        res.status(409).json({
          error: "Cannot deactivate an account with active child accounts",
          code: "ACCOUNT_HAS_ACTIVE_CHILDREN",
          details: { activeChildren },
        });
        return;
      }
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: existing.id },
        data: active
          ? { isActive: true, reactivatedAt: now }
          : { isActive: false, deactivatedAt: now },
      });
      await logMasterDataEvent(tx, {
        organizationId: orgId,
        userId,
        entity: "Account",
        entityId: existing.id,
        action: active ? "reactivated" : "deactivated",
        summary: active ? "Account reactivated" : "Account deactivated",
      });
    });

    const detail = await loadAccountDetail(orgId, existing.id);
    res.json(detail);
  })
);

router.get(
  "/journal-entries",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = journalEntriesListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status } = parsed.data;
    const skip = (page - 1) * limit;
    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { entryNumber: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
              { sourceReference: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: entrySummaryInclude,
        orderBy: [{ entryDate: "desc" }, { entryNumber: "desc" }],
        skip,
        take: limit,
      }),
      prisma.journalEntry.count({ where }),
    ]);

    res.json({
      data: entries.map(serializeJournalEntry),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/journal-entries/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = journalEntryIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid journal entry id" });
      return;
    }

    const entry = await prisma.journalEntry.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: entryInclude,
    });
    if (!entry) {
      res.status(404).json({ error: "Journal entry not found" });
      return;
    }

    res.json(serializeJournalEntryDetail(entry));
  })
);

router.get(
  "/trial-balance",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = trialBalanceSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters" });
      return;
    }

    const accounts = await prisma.account.findMany({
      where: {
        organizationId: orgId,
        ...(parsed.data.type ? { type: parsed.data.type } : {}),
      },
      orderBy: { code: "asc" },
    });

    const { totals: postedTotals } = await getPostedAccountTotals(orgId);

    let sumDebit = 0;
    let sumCredit = 0;
    const rows = accounts.map((account) => {
      const t = postedTotals.get(account.id) ?? { debit: 0, credit: 0, account };
      sumDebit += t.debit;
      sumCredit += t.credit;
      return buildTrialBalanceRow(account, t.debit, t.credit);
    });

    res.json({
      rows,
      totals: {
        totalDebit: formatMoney(sumDebit),
        totalCredit: formatMoney(sumCredit),
        isBalanced: Math.abs(sumDebit - sumCredit) < 0.01,
      },
    });
  })
);

router.post(
  "/journal-entries",
  requirePermission(ACCOUNTING_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createJournalEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const { description, entryDate, sourceModule, sourceReference, lines } = parsed.data;
    const balanceCheck = validateBalancedLines(lines);
    if (!balanceCheck.valid) {
      res.status(400).json({ error: "Journal entry must be balanced (debits = credits)" });
      return;
    }

    const accountIds = lines.map((l) => l.accountId);
    const accounts = await prisma.account.findMany({
      where: { organizationId: orgId, id: { in: accountIds }, isActive: true },
    });
    if (accounts.length !== accountIds.length) {
      res.status(400).json({ error: "One or more accounts not found or inactive" });
      return;
    }

    const count = await prisma.journalEntry.count({ where: { organizationId: orgId } });
    const entryNumber = `JE-2026-${String(count + 1).padStart(4, "0")}`;

    const entry = await prisma.journalEntry.create({
      data: {
        organizationId: orgId,
        entryNumber,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        description,
        status: "DRAFT",
        sourceModule: sourceModule ?? null,
        sourceReference: sourceReference ?? null,
        createdById: req.user!.userId,
        lines: {
          create: lines.map((line) => ({
            organizationId: orgId,
            accountId: line.accountId,
            description: line.description ?? null,
            debit: line.debit,
            credit: line.credit,
          })),
        },
      },
      include: entryInclude,
    });

    res.status(201).json(serializeJournalEntryDetail(entry));
  })
);

router.patch(
  "/journal-entries/:id/post",
  requirePermission(ACCOUNTING_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = journalEntryIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid journal entry id" });
      return;
    }

    const existing = await prisma.journalEntry.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: { lines: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Journal entry not found" });
      return;
    }
    if (existing.status !== "DRAFT") {
      res.status(400).json({
        error:
          existing.status === "POSTED"
            ? "This journal entry is already posted."
            : "This journal entry cannot be posted in its current status.",
      });
      return;
    }

    const { totalDebit, totalCredit } = sumEntryLines(existing.lines);
    if (Math.abs(totalDebit - totalCredit) >= 0.01 || totalDebit === 0) {
      res.status(400).json({
        error: "Journal entry must be balanced with equal non-zero debits and credits before posting.",
      });
      return;
    }

    const entry = await prisma.journalEntry.update({
      where: { id: existing.id },
      data: { status: "POSTED" },
      include: entryInclude,
    });

    res.json(serializeJournalEntryDetail(entry));
  })
);

router.patch(
  "/journal-entries/:id/void",
  requirePermission(ACCOUNTING_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = journalEntryIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid journal entry id" });
      return;
    }

    const existing = await prisma.journalEntry.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Journal entry not found" });
      return;
    }
    if (existing.status === "VOID") {
      res.status(400).json({ error: "Entry is already void" });
      return;
    }

    const entry = await prisma.journalEntry.update({
      where: { id: existing.id },
      data: { status: "VOID" },
      include: entryInclude,
    });

    res.json(serializeJournalEntryDetail(entry));
  })
);

export default router;

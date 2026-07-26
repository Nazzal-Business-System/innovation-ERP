import { Router } from "express";
import { ACCOUNTING_PERMISSIONS, FINANCE_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  applyCustomerPayment,
  applyVendorPayment,
  receiveVendorBill,
  sendCustomerInvoice,
} from "../lib/finance-workflow.js";
import {
  AGING_LABELS,
  getAgingBucket,
  serializeCustomerInvoice,
  serializeCustomerInvoiceDetail,
  serializeCustomerPayment,
  serializeCustomerPaymentDetail,
  serializeVendorBill,
  serializeVendorBillDetail,
  serializeVendorPayment,
  serializeVendorPaymentDetail,
} from "../lib/serialize-finance.js";
import {
  billsListSchema,
  billIdSchema,
  createCustomerInvoiceSchema,
  createCustomerPaymentSchema,
  createVendorBillSchema,
  createVendorPaymentSchema,
  invoiceIdSchema,
  invoicesListSchema,
  paymentIdSchema,
  paymentsListSchema,
} from "../lib/finance-validation.js";
import { formatMoney } from "../lib/serialize-accounting.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

const invoiceInclude = {
  customer: true,
  salesOrder: true,
  createdBy: true,
  lines: { include: { product: true }, orderBy: { createdAt: "asc" as const } },
  payments: {
    include: { createdBy: true, customer: true, customerInvoice: true },
    orderBy: { paymentDate: "desc" as const },
  },
};

const invoiceSummaryInclude = {
  customer: true,
  salesOrder: true,
  _count: { select: { lines: true } },
};

const billInclude = {
  vendor: true,
  purchaseOrder: true,
  createdBy: true,
  lines: { include: { product: true }, orderBy: { createdAt: "asc" as const } },
  payments: {
    include: { createdBy: true, vendor: true, vendorBill: true },
    orderBy: { paymentDate: "desc" as const },
  },
};

const billSummaryInclude = {
  vendor: true,
  purchaseOrder: true,
  _count: { select: { lines: true } },
};

const paymentInclude = {
  createdBy: true,
  customer: true,
  customerInvoice: true,
};

const vendorPaymentInclude = {
  createdBy: true,
  vendor: true,
  vendorBill: true,
};

async function findFinanceJournal(orgId: string, sourceReference: string) {
  const entry = await prisma.journalEntry.findFirst({
    where: {
      organizationId: orgId,
      sourceModule: "finance",
      sourceReference,
    },
    select: { id: true, entryNumber: true, status: true },
  });
  return entry
    ? { id: entry.id, entryNumber: entry.entryNumber, status: entry.status }
    : null;
}

router.use(requireJwtConfigured);
router.use(authenticate);

router.get(
  "/overview",
  requirePermission(FINANCE_PERMISSIONS.READ, ACCOUNTING_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now.toISOString().slice(0, 10));

    type BalanceAggRow = {
      total: unknown;
      open_count: unknown;
      overdue: unknown;
    };

    const [
      arRows,
      apRows,
      recentInvoices,
      recentBills,
      customerPayments,
      vendorPayments,
      cashAgg,
      paymentsAgg,
    ] = await Promise.all([
      prisma.$queryRaw<BalanceAggRow[]>`
        SELECT
          COALESCE(SUM(
            CASE
              WHEN status <> 'DRAFT' AND (total_amount - amount_paid) > 0
              THEN (total_amount - amount_paid)
              ELSE 0
            END
          ), 0) AS total,
          COUNT(*) FILTER (
            WHERE status <> 'DRAFT' AND (total_amount - amount_paid) > 0
          ) AS open_count,
          COALESCE(SUM(
            CASE
              WHEN status <> 'DRAFT'
                AND status <> 'PAID'
                AND due_date < ${today}
                AND (total_amount - amount_paid) > 0
              THEN (total_amount - amount_paid)
              ELSE 0
            END
          ), 0) AS overdue
        FROM customer_invoices
        WHERE organization_id = ${orgId}
          AND status <> 'VOID'
      `,
      prisma.$queryRaw<BalanceAggRow[]>`
        SELECT
          COALESCE(SUM(
            CASE
              WHEN status <> 'DRAFT' AND (total_amount - amount_paid) > 0
              THEN (total_amount - amount_paid)
              ELSE 0
            END
          ), 0) AS total,
          COUNT(*) FILTER (
            WHERE status <> 'DRAFT' AND (total_amount - amount_paid) > 0
          ) AS open_count,
          COALESCE(SUM(
            CASE
              WHEN status <> 'DRAFT'
                AND status <> 'PAID'
                AND due_date < ${today}
                AND (total_amount - amount_paid) > 0
              THEN (total_amount - amount_paid)
              ELSE 0
            END
          ), 0) AS overdue
        FROM vendor_bills
        WHERE organization_id = ${orgId}
          AND status <> 'VOID'
      `,
      prisma.customerInvoice.findMany({
        where: { organizationId: orgId, status: { not: "VOID" } },
        include: invoiceSummaryInclude,
        orderBy: { invoiceDate: "desc" },
        take: 8,
      }),
      prisma.vendorBill.findMany({
        where: { organizationId: orgId, status: { not: "VOID" } },
        include: billSummaryInclude,
        orderBy: { billDate: "desc" },
        take: 8,
      }),
      prisma.customerPayment.findMany({
        where: { organizationId: orgId, paymentDate: { gte: monthStart } },
        include: paymentInclude,
        orderBy: { paymentDate: "desc" },
        take: 8,
      }),
      prisma.vendorPayment.findMany({
        where: { organizationId: orgId, paymentDate: { gte: monthStart } },
        include: vendorPaymentInclude,
        orderBy: { paymentDate: "desc" },
        take: 8,
      }),
      prisma.customerPayment.aggregate({
        where: { organizationId: orgId, paymentDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.vendorPayment.aggregate({
        where: { organizationId: orgId, paymentDate: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

    const ar = arRows[0];
    const ap = apRows[0];

    res.json({
      accountsReceivable: formatMoney(Number(ar?.total ?? 0)),
      accountsPayable: formatMoney(Number(ap?.total ?? 0)),
      overdueReceivables: formatMoney(Number(ar?.overdue ?? 0)),
      overduePayables: formatMoney(Number(ap?.overdue ?? 0)),
      cashCollectedThisMonth: formatMoney(Number(cashAgg._sum.amount ?? 0)),
      paymentsMadeThisMonth: formatMoney(Number(paymentsAgg._sum.amount ?? 0)),
      openInvoices: Number(ar?.open_count ?? 0),
      openBills: Number(ap?.open_count ?? 0),
      recentInvoices: recentInvoices.map(serializeCustomerInvoice),
      recentBills: recentBills.map(serializeVendorBill),
      recentCustomerPayments: customerPayments.map(serializeCustomerPayment),
      recentVendorPayments: vendorPayments.map(serializeVendorPayment),
    });
  })
);

router.get(
  "/customer-invoices",
  requirePermission(FINANCE_PERMISSIONS.READ, ACCOUNTING_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = invoicesListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters" });
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
              { invoiceNumber: { contains: search, mode: "insensitive" as const } },
              { customer: { name: { contains: search, mode: "insensitive" as const } } },
              { customer: { code: { contains: search, mode: "insensitive" as const } } },
              { salesOrder: { soNumber: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [invoices, total] = await Promise.all([
      prisma.customerInvoice.findMany({
        where,
        include: invoiceSummaryInclude,
        orderBy: [{ invoiceDate: "desc" }, { invoiceNumber: "desc" }],
        skip,
        take: limit,
      }),
      prisma.customerInvoice.count({ where }),
    ]);

    res.json({
      data: invoices.map(serializeCustomerInvoice),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/customer-invoices/:id",
  requirePermission(FINANCE_PERMISSIONS.READ, ACCOUNTING_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = invoiceIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid invoice id" });
      return;
    }

    const invoice = await prisma.customerInvoice.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: invoiceInclude,
    });

    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const journalEntry = await findFinanceJournal(orgId, invoice.invoiceNumber);
    res.json(serializeCustomerInvoiceDetail(invoice, journalEntry));
  })
);

router.post(
  "/customer-invoices",
  requirePermission(FINANCE_PERMISSIONS.WRITE, ACCOUNTING_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createCustomerInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const { customerId, salesOrderId, dueDate, notes, lines } = parsed.data;
    const invoiceDate = parsed.data.invoiceDate ? new Date(parsed.data.invoiceDate) : new Date();

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: orgId, isActive: true },
    });
    if (!customer) {
      res.status(400).json({ error: "Customer not found" });
      return;
    }

    if (salesOrderId) {
      const so = await prisma.salesOrder.findFirst({
        where: { id: salesOrderId, organizationId: orgId, customerId },
      });
      if (!so) {
        res.status(400).json({ error: "Sales order not found for customer" });
        return;
      }
    }

    let subtotal = 0;
    const lineData = lines.map((line) => {
      const lineTotal = line.quantity * line.unitPrice;
      subtotal += lineTotal;
      return {
        organizationId: orgId,
        productId: line.productId ?? null,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal,
      };
    });

    const taxAmount = Math.round(subtotal * 0.16 * 100) / 100;
    const totalAmount = subtotal + taxAmount;
    const count = await prisma.customerInvoice.count({ where: { organizationId: orgId } });
    const invoiceNumber = `INV-2026-${String(count + 1).padStart(4, "0")}`;

    const invoice = await prisma.customerInvoice.create({
      data: {
        organizationId: orgId,
        customerId,
        salesOrderId: salesOrderId ?? null,
        invoiceNumber,
        status: "DRAFT",
        invoiceDate,
        dueDate: new Date(dueDate),
        subtotal,
        taxAmount,
        totalAmount,
        notes: notes ?? null,
        createdById: req.user!.userId,
        lines: { create: lineData },
      },
      include: invoiceInclude,
    });

    res.status(201).json(serializeCustomerInvoiceDetail(invoice));
  })
);

router.patch(
  "/customer-invoices/:id/send",
  requirePermission(FINANCE_PERMISSIONS.WRITE, ACCOUNTING_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = invoiceIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid invoice id" });
      return;
    }

    try {
      const updated = await sendCustomerInvoice(parsed.data.id, orgId, req.user!.userId);
      const journalEntry = await findFinanceJournal(orgId, updated.invoiceNumber);
      res.json(serializeCustomerInvoiceDetail(updated, journalEntry));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Send failed" });
    }
  })
);

router.get(
  "/customer-payments",
  requirePermission(FINANCE_PERMISSIONS.READ, ACCOUNTING_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = paymentsListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters" });
      return;
    }

    const { page, limit, search } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(search
        ? {
            OR: [
              { paymentNumber: { contains: search, mode: "insensitive" as const } },
              { customer: { name: { contains: search, mode: "insensitive" as const } } },
              { customerInvoice: { invoiceNumber: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [payments, total] = await Promise.all([
      prisma.customerPayment.findMany({
        where,
        include: paymentInclude,
        orderBy: { paymentDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.customerPayment.count({ where }),
    ]);

    res.json({
      data: payments.map(serializeCustomerPayment),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/customer-payments/:id",
  requirePermission(FINANCE_PERMISSIONS.READ, ACCOUNTING_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = paymentIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payment id" });
      return;
    }

    const payment = await prisma.customerPayment.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: paymentInclude,
    });
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const journalEntry = await findFinanceJournal(orgId, payment.paymentNumber);
    res.json(serializeCustomerPaymentDetail(payment, journalEntry));
  })
);

router.post(
  "/customer-payments",
  requirePermission(FINANCE_PERMISSIONS.WRITE, ACCOUNTING_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createCustomerPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    try {
      const payment = await applyCustomerPayment({
        orgId,
        userId: req.user!.userId,
        customerInvoiceId: parsed.data.customerInvoiceId,
        amount: parsed.data.amount,
        paymentMethod: parsed.data.paymentMethod,
        paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : new Date(),
        reference: parsed.data.reference,
        notes: parsed.data.notes,
      });

      const full = await prisma.customerPayment.findFirstOrThrow({
        where: { id: payment.id },
        include: paymentInclude,
      });

      res.status(201).json(serializeCustomerPayment(full));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Payment failed" });
    }
  })
);

router.get(
  "/vendor-bills",
  requirePermission(FINANCE_PERMISSIONS.READ, ACCOUNTING_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = billsListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters" });
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
              { billNumber: { contains: search, mode: "insensitive" as const } },
              { vendor: { name: { contains: search, mode: "insensitive" as const } } },
              { vendor: { code: { contains: search, mode: "insensitive" as const } } },
              { purchaseOrder: { poNumber: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [bills, total] = await Promise.all([
      prisma.vendorBill.findMany({
        where,
        include: billSummaryInclude,
        orderBy: [{ billDate: "desc" }, { billNumber: "desc" }],
        skip,
        take: limit,
      }),
      prisma.vendorBill.count({ where }),
    ]);

    res.json({
      data: bills.map(serializeVendorBill),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/vendor-bills/:id",
  requirePermission(FINANCE_PERMISSIONS.READ, ACCOUNTING_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = billIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid bill id" });
      return;
    }

    const bill = await prisma.vendorBill.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: billInclude,
    });

    if (!bill) {
      res.status(404).json({ error: "Bill not found" });
      return;
    }

    const journalEntry = await findFinanceJournal(orgId, bill.billNumber);
    res.json(serializeVendorBillDetail(bill, journalEntry));
  })
);

router.post(
  "/vendor-bills",
  requirePermission(FINANCE_PERMISSIONS.WRITE, ACCOUNTING_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createVendorBillSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const { vendorId, purchaseOrderId, dueDate, notes, lines } = parsed.data;
    const billDate = parsed.data.billDate ? new Date(parsed.data.billDate) : new Date();

    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, organizationId: orgId, isActive: true },
    });
    if (!vendor) {
      res.status(400).json({ error: "Vendor not found" });
      return;
    }

    if (purchaseOrderId) {
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: purchaseOrderId, organizationId: orgId, vendorId },
      });
      if (!po) {
        res.status(400).json({ error: "Purchase order not found for vendor" });
        return;
      }
    }

    let subtotal = 0;
    const lineData = lines.map((line) => {
      const lineTotal = line.quantity * line.unitCost;
      subtotal += lineTotal;
      return {
        organizationId: orgId,
        productId: line.productId ?? null,
        description: line.description,
        quantity: line.quantity,
        unitCost: line.unitCost,
        lineTotal,
      };
    });

    const taxAmount = Math.round(subtotal * 0.16 * 100) / 100;
    const totalAmount = subtotal + taxAmount;
    const count = await prisma.vendorBill.count({ where: { organizationId: orgId } });
    const billNumber = `BILL-2026-${String(count + 1).padStart(4, "0")}`;

    const bill = await prisma.vendorBill.create({
      data: {
        organizationId: orgId,
        vendorId,
        purchaseOrderId: purchaseOrderId ?? null,
        billNumber,
        status: "DRAFT",
        billDate,
        dueDate: new Date(dueDate),
        subtotal,
        taxAmount,
        totalAmount,
        notes: notes ?? null,
        createdById: req.user!.userId,
        lines: { create: lineData },
      },
      include: billInclude,
    });

    res.status(201).json(serializeVendorBillDetail(bill));
  })
);

router.patch(
  "/vendor-bills/:id/receive",
  requirePermission(FINANCE_PERMISSIONS.WRITE, ACCOUNTING_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = billIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid bill id" });
      return;
    }

    try {
      const updated = await receiveVendorBill(parsed.data.id, orgId, req.user!.userId);
      const journalEntry = await findFinanceJournal(orgId, updated.billNumber);
      res.json(serializeVendorBillDetail(updated, journalEntry));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Receive failed" });
    }
  })
);

router.get(
  "/vendor-payments",
  requirePermission(FINANCE_PERMISSIONS.READ, ACCOUNTING_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = paymentsListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters" });
      return;
    }

    const { page, limit, search } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(search
        ? {
            OR: [
              { paymentNumber: { contains: search, mode: "insensitive" as const } },
              { vendor: { name: { contains: search, mode: "insensitive" as const } } },
              { vendorBill: { billNumber: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [payments, total] = await Promise.all([
      prisma.vendorPayment.findMany({
        where,
        include: vendorPaymentInclude,
        orderBy: { paymentDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.vendorPayment.count({ where }),
    ]);

    res.json({
      data: payments.map(serializeVendorPayment),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/vendor-payments/:id",
  requirePermission(FINANCE_PERMISSIONS.READ, ACCOUNTING_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = paymentIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payment id" });
      return;
    }

    const payment = await prisma.vendorPayment.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: vendorPaymentInclude,
    });
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    const journalEntry = await findFinanceJournal(orgId, payment.paymentNumber);
    res.json(serializeVendorPaymentDetail(payment, journalEntry));
  })
);

router.post(
  "/vendor-payments",
  requirePermission(FINANCE_PERMISSIONS.WRITE, ACCOUNTING_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createVendorPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    try {
      const payment = await applyVendorPayment({
        orgId,
        userId: req.user!.userId,
        vendorBillId: parsed.data.vendorBillId,
        amount: parsed.data.amount,
        paymentMethod: parsed.data.paymentMethod,
        paymentDate: parsed.data.paymentDate ? new Date(parsed.data.paymentDate) : new Date(),
        reference: parsed.data.reference,
        notes: parsed.data.notes,
      });

      const full = await prisma.vendorPayment.findFirstOrThrow({
        where: { id: payment.id },
        include: vendorPaymentInclude,
      });

      res.status(201).json(serializeVendorPayment(full));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Payment failed" });
    }
  })
);

function buildAgingReport(
  items: Array<{
    id: string;
    documentNumber: string;
    partyName: string;
    partyCode: string;
    dueDate: Date;
    balance: number;
  }>
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bucketTotals: Record<string, { count: number; amount: number }> = {
    current: { count: 0, amount: 0 },
    "1-30": { count: 0, amount: 0 },
    "31-60": { count: 0, amount: 0 },
    "61-90": { count: 0, amount: 0 },
    "90+": { count: 0, amount: 0 },
  };

  const reportItems = items
    .filter((i) => i.balance > 0)
    .map((item) => {
      const due = new Date(item.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysPastDue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      const bucket = getAgingBucket(daysPastDue);
      bucketTotals[bucket].count += 1;
      bucketTotals[bucket].amount += item.balance;
      return {
        id: item.id,
        documentNumber: item.documentNumber,
        partyName: item.partyName,
        partyCode: item.partyCode,
        dueDate: item.dueDate.toISOString().slice(0, 10),
        balanceDue: formatMoney(item.balance),
        daysPastDue: Math.max(0, daysPastDue),
        bucket: AGING_LABELS[bucket],
      };
    })
    .sort((a, b) => b.daysPastDue - a.daysPastDue);

  const totalOutstanding = items.reduce((s, i) => s + i.balance, 0);

  return {
    buckets: (["current", "1-30", "31-60", "61-90", "90+"] as const).map((bucket) => ({
      bucket,
      label: AGING_LABELS[bucket],
      count: bucketTotals[bucket].count,
      amount: formatMoney(bucketTotals[bucket].amount),
    })),
    totalOutstanding: formatMoney(totalOutstanding),
    items: reportItems,
  };
}

router.get(
  "/ar-aging",
  requirePermission(FINANCE_PERMISSIONS.READ, ACCOUNTING_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const invoices = await prisma.customerInvoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE", "PAID"] },
      },
      include: { customer: true },
    });

    const items = invoices.map((inv) => ({
      id: inv.id,
      documentNumber: inv.invoiceNumber,
      partyName: inv.customer.name,
      partyCode: inv.customer.code,
      dueDate: inv.dueDate,
      balance: Math.max(0, Number(inv.totalAmount) - Number(inv.amountPaid)),
    }));

    res.json(buildAgingReport(items));
  })
);

router.get(
  "/ap-aging",
  requirePermission(FINANCE_PERMISSIONS.READ, ACCOUNTING_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const bills = await prisma.vendorBill.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["RECEIVED", "PARTIALLY_PAID", "OVERDUE", "PAID"] },
      },
      include: { vendor: true },
    });

    const items = bills.map((bill) => ({
      id: bill.id,
      documentNumber: bill.billNumber,
      partyName: bill.vendor.name,
      partyCode: bill.vendor.code,
      dueDate: bill.dueDate,
      balance: Math.max(0, Number(bill.totalAmount) - Number(bill.amountPaid)),
    }));

    res.json(buildAgingReport(items));
  })
);

export default router;

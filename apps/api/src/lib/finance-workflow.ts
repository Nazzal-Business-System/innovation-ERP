import type { InvoiceStatus, BillStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "./prisma.js";
import {
  postCustomerPaymentJournal,
  postInvoiceSentJournal,
  postVendorBillReceivedJournal,
  postVendorPaymentJournal,
  resolveEffectiveBillStatus,
  resolveEffectiveInvoiceStatus,
} from "./finance-journal.js";

function computeInvoiceStatus(
  current: InvoiceStatus,
  amountPaid: number,
  totalAmount: number,
  dueDate: Date
): InvoiceStatus {
  const effective = resolveEffectiveInvoiceStatus(current, dueDate, amountPaid, totalAmount);
  return effective as InvoiceStatus;
}

function computeBillStatus(
  current: BillStatus,
  amountPaid: number,
  totalAmount: number,
  dueDate: Date
): BillStatus {
  const effective = resolveEffectiveBillStatus(current, dueDate, amountPaid, totalAmount);
  return effective as BillStatus;
}

export async function sendCustomerInvoice(invoiceId: string, orgId: string, userId: string) {
  const invoice = await prisma.customerInvoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    include: { lines: true },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "DRAFT") {
    throw new Error("This invoice has already been sent or cannot be sent in its current status.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.customerInvoice.update({
      where: { id: invoice.id },
      data: { status: "SENT", sentAt: new Date() },
      include: {
        customer: true,
        salesOrder: true,
        lines: { include: { product: true } },
        payments: { include: { createdBy: true, customer: true, customerInvoice: true } },
      },
    });

    await postInvoiceSentJournal(
      tx,
      orgId,
      userId,
      invoice.invoiceNumber,
      invoice.invoiceDate,
      Number(invoice.subtotal),
      Number(invoice.taxAmount),
      Number(invoice.totalAmount)
    );

    return updated;
  });
}

export async function applyCustomerPayment(params: {
  orgId: string;
  userId: string;
  customerInvoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  reference?: string;
  notes?: string;
}) {
  const invoice = await prisma.customerInvoice.findFirst({
    where: { id: params.customerInvoiceId, organizationId: params.orgId },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "DRAFT" || invoice.status === "VOID") {
    throw new Error(
      invoice.status === "VOID"
        ? "This invoice is void and cannot accept payments."
        : "Draft invoices must be sent before recording a payment."
    );
  }

  const balance = Number(invoice.totalAmount) - Number(invoice.amountPaid);
  if (params.amount <= 0) throw new Error("Payment amount must be positive");
  if (params.amount > balance + 0.01) {
    throw new Error("Payment amount exceeds the remaining invoice balance.");
  }

  const count = await prisma.customerPayment.count({ where: { organizationId: params.orgId } });
  const paymentNumber = `CP-2026-${String(count + 1).padStart(4, "0")}`;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.customerPayment.create({
      data: {
        organizationId: params.orgId,
        customerInvoiceId: invoice.id,
        customerId: invoice.customerId,
        paymentNumber,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        paymentDate: params.paymentDate,
        reference: params.reference ?? null,
        notes: params.notes ?? null,
        createdById: params.userId,
      },
    });

    const newAmountPaid = Number(invoice.amountPaid) + params.amount;
    const newStatus = computeInvoiceStatus(
      invoice.status === "OVERDUE" ? "SENT" : invoice.status,
      newAmountPaid,
      Number(invoice.totalAmount),
      invoice.dueDate
    );

    await tx.customerInvoice.update({
      where: { id: invoice.id },
      data: { amountPaid: newAmountPaid, status: newStatus },
    });

    await postCustomerPaymentJournal(
      tx,
      params.orgId,
      params.userId,
      paymentNumber,
      params.paymentDate,
      params.amount,
      params.paymentMethod
    );

    return payment;
  });
}

export async function receiveVendorBill(billId: string, orgId: string, userId: string) {
  const bill = await prisma.vendorBill.findFirst({
    where: { id: billId, organizationId: orgId },
  });

  if (!bill) throw new Error("Bill not found");
  if (bill.status !== "DRAFT") {
    throw new Error("This bill has already been received or cannot be received in its current status.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.vendorBill.update({
      where: { id: bill.id },
      data: { status: "RECEIVED", receivedAt: new Date() },
      include: {
        vendor: true,
        purchaseOrder: true,
        lines: { include: { product: true } },
        payments: { include: { createdBy: true, vendor: true, vendorBill: true } },
      },
    });

    await postVendorBillReceivedJournal(
      tx,
      orgId,
      userId,
      bill.billNumber,
      bill.billDate,
      Number(bill.subtotal),
      Number(bill.taxAmount),
      Number(bill.totalAmount)
    );

    return updated;
  });
}

export async function applyVendorPayment(params: {
  orgId: string;
  userId: string;
  vendorBillId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: Date;
  reference?: string;
  notes?: string;
}) {
  const bill = await prisma.vendorBill.findFirst({
    where: { id: params.vendorBillId, organizationId: params.orgId },
  });

  if (!bill) throw new Error("Bill not found");
  if (bill.status === "DRAFT" || bill.status === "VOID") {
    throw new Error(
      bill.status === "VOID"
        ? "This bill is void and cannot accept payments."
        : "Draft bills must be received before recording a payment."
    );
  }

  const balance = Number(bill.totalAmount) - Number(bill.amountPaid);
  if (params.amount <= 0) throw new Error("Payment amount must be positive");
  if (params.amount > balance + 0.01) {
    throw new Error("Payment amount exceeds the remaining bill balance.");
  }

  const count = await prisma.vendorPayment.count({ where: { organizationId: params.orgId } });
  const paymentNumber = `VP-2026-${String(count + 1).padStart(4, "0")}`;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.vendorPayment.create({
      data: {
        organizationId: params.orgId,
        vendorBillId: bill.id,
        vendorId: bill.vendorId,
        paymentNumber,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        paymentDate: params.paymentDate,
        reference: params.reference ?? null,
        notes: params.notes ?? null,
        createdById: params.userId,
      },
    });

    const newAmountPaid = Number(bill.amountPaid) + params.amount;
    const newStatus = computeBillStatus(
      bill.status === "OVERDUE" ? "RECEIVED" : bill.status,
      newAmountPaid,
      Number(bill.totalAmount),
      bill.dueDate
    );

    await tx.vendorBill.update({
      where: { id: bill.id },
      data: { amountPaid: newAmountPaid, status: newStatus },
    });

    await postVendorPaymentJournal(
      tx,
      params.orgId,
      params.userId,
      paymentNumber,
      params.paymentDate,
      params.amount,
      params.paymentMethod
    );

    return payment;
  });
}

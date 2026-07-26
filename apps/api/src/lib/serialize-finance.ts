import type {
  BillStatus,
  Customer,
  CustomerInvoice,
  CustomerInvoiceLine,
  CustomerPayment,
  InvoiceStatus,
  Product,
  PurchaseOrder,
  SalesOrder,
  User,
  Vendor,
  VendorBill,
  VendorBillLine,
  VendorPayment,
} from "@prisma/client";
import {
  resolveEffectiveBillStatus,
  resolveEffectiveInvoiceStatus,
} from "./finance-journal.js";
import { formatMoney } from "./serialize-accounting.js";

function formatDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

function balanceDue(total: number, paid: number): string {
  return formatMoney(Math.max(0, total - paid));
}

type InvoiceSummary = CustomerInvoice & {
  customer: Pick<Customer, "id" | "code" | "name">;
  salesOrder: Pick<SalesOrder, "id" | "soNumber"> | null;
  _count?: { lines: number };
};

type InvoiceDetail = CustomerInvoice & {
  customer: Pick<Customer, "id" | "code" | "name">;
  salesOrder: Pick<SalesOrder, "id" | "soNumber"> | null;
  createdBy?: Pick<User, "id" | "name"> | null;
  lines: Array<CustomerInvoiceLine & { product: Pick<Product, "id" | "sku"> | null }>;
  payments: Array<
    CustomerPayment & {
      createdBy: Pick<User, "id" | "name"> | null;
      customer: Pick<Customer, "id" | "code" | "name">;
      customerInvoice: Pick<CustomerInvoice, "id" | "invoiceNumber">;
    }
  >;
};

export type FinanceRelatedJournalSerialized = {
  id: string;
  entryNumber: string;
  status: string;
};

export function serializeCustomerInvoice(invoice: InvoiceSummary) {
  const status = resolveEffectiveInvoiceStatus(
    invoice.status,
    invoice.dueDate,
    Number(invoice.amountPaid),
    Number(invoice.totalAmount)
  ) as InvoiceStatus;

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status,
    invoiceDate: formatDate(invoice.invoiceDate)!,
    dueDate: formatDate(invoice.dueDate)!,
    subtotal: formatMoney(invoice.subtotal),
    taxAmount: formatMoney(invoice.taxAmount),
    totalAmount: formatMoney(invoice.totalAmount),
    amountPaid: formatMoney(invoice.amountPaid),
    balanceDue: balanceDue(Number(invoice.totalAmount), Number(invoice.amountPaid)),
    notes: invoice.notes,
    customer: { id: invoice.customer.id, code: invoice.customer.code, name: invoice.customer.name },
    salesOrder: invoice.salesOrder
      ? { id: invoice.salesOrder.id, soNumber: invoice.salesOrder.soNumber }
      : null,
    lineCount: invoice._count?.lines,
  };
}

export function serializeCustomerInvoiceDetail(
  invoice: InvoiceDetail,
  journalEntry?: FinanceRelatedJournalSerialized | null
) {
  return {
    ...serializeCustomerInvoice(invoice),
    lines: invoice.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      sku: line.product?.sku ?? null,
      description: line.description,
      quantity: line.quantity,
      unitPrice: formatMoney(line.unitPrice),
      lineTotal: formatMoney(line.lineTotal),
    })),
    payments: invoice.payments.map(serializeCustomerPayment),
    canSend: invoice.status === "DRAFT",
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    sentAt: invoice.sentAt?.toISOString() ?? null,
    createdBy: invoice.createdBy
      ? { id: invoice.createdBy.id, name: invoice.createdBy.name }
      : null,
    journalEntry: journalEntry ?? null,
  };
}

export function serializeCustomerPayment(
  payment: CustomerPayment & {
    createdBy?: Pick<User, "id" | "name"> | null;
    customer: Pick<Customer, "id" | "code" | "name">;
    customerInvoice: Pick<CustomerInvoice, "id" | "invoiceNumber">;
  }
) {
  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    amount: formatMoney(payment.amount),
    paymentMethod: payment.paymentMethod,
    paymentDate: formatDate(payment.paymentDate)!,
    reference: payment.reference,
    notes: payment.notes,
    customer: {
      id: payment.customer.id,
      code: payment.customer.code,
      name: payment.customer.name,
    },
    invoice: {
      id: payment.customerInvoice.id,
      invoiceNumber: payment.customerInvoice.invoiceNumber,
    },
    createdBy: payment.createdBy
      ? { id: payment.createdBy.id, name: payment.createdBy.name }
      : null,
  };
}

export function serializeCustomerPaymentDetail(
  payment: CustomerPayment & {
    createdBy?: Pick<User, "id" | "name"> | null;
    customer: Pick<Customer, "id" | "code" | "name">;
    customerInvoice: Pick<
      CustomerInvoice,
      "id" | "invoiceNumber" | "totalAmount" | "amountPaid" | "status" | "dueDate"
    >;
  },
  journalEntry?: FinanceRelatedJournalSerialized | null
) {
  const invoice = payment.customerInvoice;
  const status = resolveEffectiveInvoiceStatus(
    invoice.status,
    invoice.dueDate,
    Number(invoice.amountPaid),
    Number(invoice.totalAmount)
  ) as InvoiceStatus;

  return {
    ...serializeCustomerPayment(payment),
    allocation: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceTotal: formatMoney(invoice.totalAmount),
      amountApplied: formatMoney(payment.amount),
      remainingBalance: balanceDue(Number(invoice.totalAmount), Number(invoice.amountPaid)),
      invoiceStatus: status,
    },
    journalEntry: journalEntry ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

type BillSummary = VendorBill & {
  vendor: Pick<Vendor, "id" | "code" | "name">;
  purchaseOrder: Pick<PurchaseOrder, "id" | "poNumber"> | null;
  _count?: { lines: number };
};

type BillDetail = VendorBill & {
  vendor: Pick<Vendor, "id" | "code" | "name">;
  purchaseOrder: Pick<PurchaseOrder, "id" | "poNumber"> | null;
  createdBy?: Pick<User, "id" | "name"> | null;
  lines: Array<VendorBillLine & { product: Pick<Product, "id" | "sku"> | null }>;
  payments: Array<
    VendorPayment & {
      createdBy: Pick<User, "id" | "name"> | null;
      vendor: Pick<Vendor, "id" | "code" | "name">;
      vendorBill: Pick<VendorBill, "id" | "billNumber">;
    }
  >;
};

export function serializeVendorBill(bill: BillSummary) {
  const status = resolveEffectiveBillStatus(
    bill.status,
    bill.dueDate,
    Number(bill.amountPaid),
    Number(bill.totalAmount)
  ) as BillStatus;

  return {
    id: bill.id,
    billNumber: bill.billNumber,
    status,
    billDate: formatDate(bill.billDate)!,
    dueDate: formatDate(bill.dueDate)!,
    subtotal: formatMoney(bill.subtotal),
    taxAmount: formatMoney(bill.taxAmount),
    totalAmount: formatMoney(bill.totalAmount),
    amountPaid: formatMoney(bill.amountPaid),
    balanceDue: balanceDue(Number(bill.totalAmount), Number(bill.amountPaid)),
    notes: bill.notes,
    vendor: { id: bill.vendor.id, code: bill.vendor.code, name: bill.vendor.name },
    purchaseOrder: bill.purchaseOrder
      ? { id: bill.purchaseOrder.id, poNumber: bill.purchaseOrder.poNumber }
      : null,
    lineCount: bill._count?.lines,
  };
}

export function serializeVendorBillDetail(
  bill: BillDetail,
  journalEntry?: FinanceRelatedJournalSerialized | null
) {
  return {
    ...serializeVendorBill(bill),
    lines: bill.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      sku: line.product?.sku ?? null,
      description: line.description,
      quantity: line.quantity,
      unitCost: formatMoney(line.unitCost),
      lineTotal: formatMoney(line.lineTotal),
    })),
    payments: bill.payments.map(serializeVendorPayment),
    canReceive: bill.status === "DRAFT",
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString(),
    receivedAt: bill.receivedAt?.toISOString() ?? null,
    createdBy: bill.createdBy
      ? { id: bill.createdBy.id, name: bill.createdBy.name }
      : null,
    journalEntry: journalEntry ?? null,
  };
}

export function serializeVendorPayment(
  payment: VendorPayment & {
    createdBy?: Pick<User, "id" | "name"> | null;
    vendor: Pick<Vendor, "id" | "code" | "name">;
    vendorBill: Pick<VendorBill, "id" | "billNumber">;
  }
) {
  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    amount: formatMoney(payment.amount),
    paymentMethod: payment.paymentMethod,
    paymentDate: formatDate(payment.paymentDate)!,
    reference: payment.reference,
    notes: payment.notes,
    vendor: {
      id: payment.vendor.id,
      code: payment.vendor.code,
      name: payment.vendor.name,
    },
    bill: {
      id: payment.vendorBill.id,
      billNumber: payment.vendorBill.billNumber,
    },
    createdBy: payment.createdBy
      ? { id: payment.createdBy.id, name: payment.createdBy.name }
      : null,
  };
}

export function serializeVendorPaymentDetail(
  payment: VendorPayment & {
    createdBy?: Pick<User, "id" | "name"> | null;
    vendor: Pick<Vendor, "id" | "code" | "name">;
    vendorBill: Pick<
      VendorBill,
      "id" | "billNumber" | "totalAmount" | "amountPaid" | "status" | "dueDate"
    >;
  },
  journalEntry?: FinanceRelatedJournalSerialized | null
) {
  const bill = payment.vendorBill;
  const status = resolveEffectiveBillStatus(
    bill.status,
    bill.dueDate,
    Number(bill.amountPaid),
    Number(bill.totalAmount)
  ) as BillStatus;

  return {
    ...serializeVendorPayment(payment),
    allocation: {
      billId: bill.id,
      billNumber: bill.billNumber,
      billTotal: formatMoney(bill.totalAmount),
      amountApplied: formatMoney(payment.amount),
      remainingBalance: balanceDue(Number(bill.totalAmount), Number(bill.amountPaid)),
      billStatus: status,
    },
    journalEntry: journalEntry ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}

export function getAgingBucket(daysPastDue: number): "current" | "1-30" | "31-60" | "61-90" | "90+" {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "1-30";
  if (daysPastDue <= 60) return "31-60";
  if (daysPastDue <= 90) return "61-90";
  return "90+";
}

export const AGING_LABELS: Record<string, string> = {
  current: "Current",
  "1-30": "1–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "90+": "90+ days",
};

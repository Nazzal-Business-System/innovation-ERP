import { z } from "zod";

export const invoiceIdSchema = z.object({ id: z.string().uuid() });
export const billIdSchema = z.object({ id: z.string().uuid() });
export const paymentIdSchema = z.object({ id: z.string().uuid() });

export const invoicesListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z
    .enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"])
    .optional(),
});

export const billsListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z
    .enum(["DRAFT", "RECEIVED", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"])
    .optional(),
});

export const paymentsListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const invoiceLineSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

export const createCustomerInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  salesOrderId: z.string().uuid().optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string(),
  notes: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1),
});

const billLineSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitCost: z.number().positive(),
});

export const createVendorBillSchema = z.object({
  vendorId: z.string().uuid(),
  purchaseOrderId: z.string().uuid().optional(),
  billDate: z.string().optional(),
  dueDate: z.string(),
  notes: z.string().optional(),
  lines: z.array(billLineSchema).min(1),
});

export const createCustomerPaymentSchema = z.object({
  customerInvoiceId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "CHECK", "WALLET"]),
  paymentDate: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const createVendorPaymentSchema = z.object({
  vendorBillId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "CHECK", "WALLET"]),
  paymentDate: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

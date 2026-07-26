export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID";

export type BillStatus =
  | "DRAFT"
  | "RECEIVED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "VOID";

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD" | "CHECK" | "WALLET";

export interface FinanceCustomerInvoiceLine {
  id: string;
  productId: string | null;
  sku: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface FinanceCustomerInvoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  notes: string | null;
  customer: { id: string; code: string; name: string };
  salesOrder: { id: string; soNumber: string } | null;
  lineCount?: number;
}

export interface FinanceRelatedJournal {
  id: string;
  entryNumber: string;
  status: string;
}

export interface FinanceCustomerInvoiceDetail extends FinanceCustomerInvoice {
  lines: FinanceCustomerInvoiceLine[];
  payments: FinanceCustomerPayment[];
  canSend: boolean;
  createdAt?: string;
  updatedAt?: string;
  sentAt?: string | null;
  createdBy?: { id: string; name: string } | null;
  journalEntry?: FinanceRelatedJournal | null;
}

export interface FinanceCustomerPayment {
  id: string;
  paymentNumber: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  customer: { id: string; code: string; name: string };
  invoice: { id: string; invoiceNumber: string };
  createdBy: { id: string; name: string } | null;
}

export interface FinanceCustomerPaymentDetail extends FinanceCustomerPayment {
  allocation: {
    invoiceId: string;
    invoiceNumber: string;
    invoiceTotal: string;
    amountApplied: string;
    remainingBalance: string;
    invoiceStatus: InvoiceStatus;
  };
  journalEntry: FinanceRelatedJournal | null;
  createdAt?: string;
}

export interface FinanceVendorBillLine {
  id: string;
  productId: string | null;
  sku: string | null;
  description: string;
  quantity: number;
  unitCost: string;
  lineTotal: string;
}

export interface FinanceVendorBill {
  id: string;
  billNumber: string;
  status: BillStatus;
  billDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  notes: string | null;
  vendor: { id: string; code: string; name: string };
  purchaseOrder: { id: string; poNumber: string } | null;
  lineCount?: number;
}

export interface FinanceVendorBillDetail extends FinanceVendorBill {
  lines: FinanceVendorBillLine[];
  payments: FinanceVendorPayment[];
  canReceive: boolean;
  createdAt?: string;
  updatedAt?: string;
  receivedAt?: string | null;
  createdBy?: { id: string; name: string } | null;
  journalEntry?: FinanceRelatedJournal | null;
}

export interface FinanceVendorPayment {
  id: string;
  paymentNumber: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  vendor: { id: string; code: string; name: string };
  bill: { id: string; billNumber: string };
  createdBy: { id: string; name: string } | null;
}

export interface FinanceVendorPaymentDetail extends FinanceVendorPayment {
  allocation: {
    billId: string;
    billNumber: string;
    billTotal: string;
    amountApplied: string;
    remainingBalance: string;
    billStatus: BillStatus;
  };
  journalEntry: FinanceRelatedJournal | null;
  createdAt?: string;
}

export interface FinanceAgingBucket {
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
  label: string;
  count: number;
  amount: string;
}

export interface FinanceAgingReport {
  buckets: FinanceAgingBucket[];
  totalOutstanding: string;
  items: Array<{
    id: string;
    documentNumber: string;
    partyName: string;
    partyCode: string;
    dueDate: string;
    balanceDue: string;
    daysPastDue: number;
    bucket: string;
  }>;
}

export interface FinanceOverview {
  accountsReceivable: string;
  accountsPayable: string;
  overdueReceivables: string;
  overduePayables: string;
  cashCollectedThisMonth: string;
  paymentsMadeThisMonth: string;
  openInvoices: number;
  openBills: number;
  recentInvoices: FinanceCustomerInvoice[];
  recentBills: FinanceVendorBill[];
  recentCustomerPayments: FinanceCustomerPayment[];
  recentVendorPayments: FinanceVendorPayment[];
}

export const FINANCE_PERMISSIONS = {
  READ: "finance.read",
  WRITE: "finance.write",
} as const;

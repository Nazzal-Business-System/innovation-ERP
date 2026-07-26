import { PrismaClient, type InvoiceStatus, type BillStatus, type PaymentMethod } from "@prisma/client";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const FINANCE_USER_ID = "00000000-0000-4000-8000-000000000021";

type InvoiceSeed = {
  id: string;
  invoiceNumber: string;
  salesOrderId: string;
  status: InvoiceStatus;
  invoiceDate: string;
  dueDate: string;
  amountPaid?: number;
  notes?: string;
};

type BillSeed = {
  id: string;
  billNumber: string;
  purchaseOrderId: string;
  status: BillStatus;
  billDate: string;
  dueDate: string;
  amountPaid?: number;
  notes?: string;
};

const INVOICE_SEEDS: InvoiceSeed[] = [
  { id: "00000000-0000-4000-8000-000000000900", invoiceNumber: "INV-2026-0001", salesOrderId: "00000000-0000-4000-8000-000000000620", status: "PAID", invoiceDate: "2026-01-08", dueDate: "2026-01-23", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000901", invoiceNumber: "INV-2026-0002", salesOrderId: "00000000-0000-4000-8000-000000000621", status: "PAID", invoiceDate: "2026-01-12", dueDate: "2026-01-27", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000902", invoiceNumber: "INV-2026-0003", salesOrderId: "00000000-0000-4000-8000-000000000622", status: "PAID", invoiceDate: "2026-01-18", dueDate: "2026-02-02", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000903", invoiceNumber: "INV-2026-0004", salesOrderId: "00000000-0000-4000-8000-000000000623", status: "PAID", invoiceDate: "2026-02-03", dueDate: "2026-02-18", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000904", invoiceNumber: "INV-2026-0005", salesOrderId: "00000000-0000-4000-8000-000000000624", status: "PAID", invoiceDate: "2026-02-10", dueDate: "2026-02-25", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000905", invoiceNumber: "INV-2026-0006", salesOrderId: "00000000-0000-4000-8000-000000000625", status: "PAID", invoiceDate: "2026-03-02", dueDate: "2026-03-17", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000906", invoiceNumber: "INV-2026-0007", salesOrderId: "00000000-0000-4000-8000-000000000626", status: "PARTIALLY_PAID", invoiceDate: "2026-03-08", dueDate: "2026-03-23", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000907", invoiceNumber: "INV-2026-0008", salesOrderId: "00000000-0000-4000-8000-000000000627", status: "SENT", invoiceDate: "2026-03-12", dueDate: "2026-03-27", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000908", invoiceNumber: "INV-2026-0009", salesOrderId: "00000000-0000-4000-8000-000000000628", status: "SENT", invoiceDate: "2026-03-18", dueDate: "2026-04-02", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000909", invoiceNumber: "INV-2026-0010", salesOrderId: "00000000-0000-4000-8000-000000000629", status: "OVERDUE", invoiceDate: "2026-04-05", dueDate: "2026-05-05", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000910", invoiceNumber: "INV-2026-0011", salesOrderId: "00000000-0000-4000-8000-000000000630", status: "OVERDUE", invoiceDate: "2026-04-08", dueDate: "2026-05-08", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000911", invoiceNumber: "INV-2026-0012", salesOrderId: "00000000-0000-4000-8000-000000000631", status: "PARTIALLY_PAID", invoiceDate: "2026-04-12", dueDate: "2026-05-12", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000912", invoiceNumber: "INV-2026-0013", salesOrderId: "00000000-0000-4000-8000-000000000632", status: "SENT", invoiceDate: "2026-05-05", dueDate: "2026-06-20", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000913", invoiceNumber: "INV-2026-0014", salesOrderId: "00000000-0000-4000-8000-000000000633", status: "DRAFT", invoiceDate: "2026-05-10", dueDate: "2026-06-25" },
  { id: "00000000-0000-4000-8000-000000000914", invoiceNumber: "INV-2026-0015", salesOrderId: "00000000-0000-4000-8000-000000000634", status: "DRAFT", invoiceDate: "2026-05-12", dueDate: "2026-06-27" },
  { id: "00000000-0000-4000-8000-000000000915", invoiceNumber: "INV-2026-0016", salesOrderId: "00000000-0000-4000-8000-000000000635", status: "SENT", invoiceDate: "2026-05-18", dueDate: "2026-07-02", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000916", invoiceNumber: "INV-2026-0017", salesOrderId: "00000000-0000-4000-8000-000000000636", status: "VOID", invoiceDate: "2026-05-20", dueDate: "2026-07-05", notes: "Voided — duplicate invoice" },
  { id: "00000000-0000-4000-8000-000000000917", invoiceNumber: "INV-2026-0018", salesOrderId: "00000000-0000-4000-8000-000000000637", status: "OVERDUE", invoiceDate: "2026-04-01", dueDate: "2026-04-15", amountPaid: 0 },
];

const BILL_SEEDS: BillSeed[] = [
  { id: "00000000-0000-4000-8000-000000000940", billNumber: "BILL-2026-0001", purchaseOrderId: "00000000-0000-4000-8000-000000000400", status: "PAID", billDate: "2026-01-16", dueDate: "2026-02-15", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000941", billNumber: "BILL-2026-0002", purchaseOrderId: "00000000-0000-4000-8000-000000000401", status: "PAID", billDate: "2026-01-22", dueDate: "2026-02-21", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000942", billNumber: "BILL-2026-0003", purchaseOrderId: "00000000-0000-4000-8000-000000000402", status: "PAID", billDate: "2026-01-24", dueDate: "2026-02-23", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000943", billNumber: "BILL-2026-0004", purchaseOrderId: "00000000-0000-4000-8000-000000000403", status: "PARTIALLY_PAID", billDate: "2026-02-10", dueDate: "2026-03-12", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000944", billNumber: "BILL-2026-0005", purchaseOrderId: "00000000-0000-4000-8000-000000000404", status: "RECEIVED", billDate: "2026-02-20", dueDate: "2026-03-22", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000945", billNumber: "BILL-2026-0006", purchaseOrderId: "00000000-0000-4000-8000-000000000405", status: "RECEIVED", billDate: "2026-03-15", dueDate: "2026-04-14", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000946", billNumber: "BILL-2026-0007", purchaseOrderId: "00000000-0000-4000-8000-000000000406", status: "OVERDUE", billDate: "2026-03-20", dueDate: "2026-04-19", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000947", billNumber: "BILL-2026-0008", purchaseOrderId: "00000000-0000-4000-8000-000000000407", status: "OVERDUE", billDate: "2026-04-01", dueDate: "2026-05-01", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000948", billNumber: "BILL-2026-0009", purchaseOrderId: "00000000-0000-4000-8000-000000000408", status: "PARTIALLY_PAID", billDate: "2026-04-10", dueDate: "2026-05-10", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000949", billNumber: "BILL-2026-0010", purchaseOrderId: "00000000-0000-4000-8000-000000000409", status: "RECEIVED", billDate: "2026-04-15", dueDate: "2026-05-15", amountPaid: 0 },
  { id: "00000000-0000-4000-8000-000000000950", billNumber: "BILL-2026-0011", purchaseOrderId: "00000000-0000-4000-8000-000000000410", status: "DRAFT", billDate: "2026-05-01", dueDate: "2026-06-01" },
  { id: "00000000-0000-4000-8000-000000000951", billNumber: "BILL-2026-0012", purchaseOrderId: "00000000-0000-4000-8000-000000000411", status: "DRAFT", billDate: "2026-05-05", dueDate: "2026-06-05" },
  { id: "00000000-0000-4000-8000-000000000952", billNumber: "BILL-2026-0013", purchaseOrderId: "00000000-0000-4000-8000-000000000412", status: "VOID", billDate: "2026-05-08", dueDate: "2026-06-08", notes: "Voided — vendor credit note" },
  { id: "00000000-0000-4000-8000-000000000953", billNumber: "BILL-2026-0014", purchaseOrderId: "00000000-0000-4000-8000-000000000413", status: "RECEIVED", billDate: "2026-05-12", dueDate: "2026-06-22", amountPaid: 0 },
];

const CUSTOMER_PAYMENT_SEEDS = [
  { id: "00000000-0000-4000-8000-000000000920", paymentNumber: "CP-2026-0001", invoiceId: "00000000-0000-4000-8000-000000000900", amount: 0, method: "BANK_TRANSFER" as PaymentMethod, date: "2026-01-20" },
  { id: "00000000-0000-4000-8000-000000000921", paymentNumber: "CP-2026-0002", invoiceId: "00000000-0000-4000-8000-000000000901", amount: 0, method: "BANK_TRANSFER" as PaymentMethod, date: "2026-01-25" },
  { id: "00000000-0000-4000-8000-000000000922", paymentNumber: "CP-2026-0003", invoiceId: "00000000-0000-4000-8000-000000000902", amount: 0, method: "CASH" as PaymentMethod, date: "2026-02-05" },
  { id: "00000000-0000-4000-8000-000000000923", paymentNumber: "CP-2026-0004", invoiceId: "00000000-0000-4000-8000-000000000903", amount: 0, method: "BANK_TRANSFER" as PaymentMethod, date: "2026-02-18" },
  { id: "00000000-0000-4000-8000-000000000924", paymentNumber: "CP-2026-0005", invoiceId: "00000000-0000-4000-8000-000000000904", amount: 0, method: "CARD" as PaymentMethod, date: "2026-02-28" },
  { id: "00000000-0000-4000-8000-000000000925", paymentNumber: "CP-2026-0006", invoiceId: "00000000-0000-4000-8000-000000000905", amount: 0, method: "BANK_TRANSFER" as PaymentMethod, date: "2026-03-18" },
  { id: "00000000-0000-4000-8000-000000000926", paymentNumber: "CP-2026-0007", invoiceId: "00000000-0000-4000-8000-000000000906", amount: 0, method: "BANK_TRANSFER" as PaymentMethod, date: "2026-03-25", partial: true },
  { id: "00000000-0000-4000-8000-000000000927", paymentNumber: "CP-2026-0008", invoiceId: "00000000-0000-4000-8000-000000000911", amount: 0, method: "CHECK" as PaymentMethod, date: "2026-05-01", partial: true },
  { id: "00000000-0000-4000-8000-000000000928", paymentNumber: "CP-2026-0009", invoiceId: "00000000-0000-4000-8000-000000000912", amount: 0, method: "WALLET" as PaymentMethod, date: "2026-05-20", partial: true },
  { id: "00000000-0000-4000-8000-000000000931", paymentNumber: "CP-2026-0010", invoiceId: "00000000-0000-4000-8000-000000000917", amount: 0, method: "BANK_TRANSFER" as PaymentMethod, date: "2026-04-20", partial: true },
  { id: "00000000-0000-4000-8000-000000000932", paymentNumber: "CP-2026-0011", invoiceId: "00000000-0000-4000-8000-000000000909", amount: 0, method: "BANK_TRANSFER" as PaymentMethod, date: "2026-05-10", partial: true },
  { id: "00000000-0000-4000-8000-000000000933", paymentNumber: "CP-2026-0012", invoiceId: "00000000-0000-4000-8000-000000000910", amount: 0, method: "CARD" as PaymentMethod, date: "2026-05-15", partial: true },
];

const VENDOR_PAYMENT_SEEDS = [
  { id: "00000000-0000-4000-8000-000000000960", paymentNumber: "VP-2026-0001", billId: "00000000-0000-4000-8000-000000000940", method: "BANK_TRANSFER" as PaymentMethod, date: "2026-02-10" },
  { id: "00000000-0000-4000-8000-000000000961", paymentNumber: "VP-2026-0002", billId: "00000000-0000-4000-8000-000000000941", method: "BANK_TRANSFER" as PaymentMethod, date: "2026-02-18" },
  { id: "00000000-0000-4000-8000-000000000962", paymentNumber: "VP-2026-0003", billId: "00000000-0000-4000-8000-000000000942", method: "BANK_TRANSFER" as PaymentMethod, date: "2026-02-25" },
  { id: "00000000-0000-4000-8000-000000000963", paymentNumber: "VP-2026-0004", billId: "00000000-0000-4000-8000-000000000943", method: "BANK_TRANSFER" as PaymentMethod, date: "2026-03-05", partial: true },
  { id: "00000000-0000-4000-8000-000000000964", paymentNumber: "VP-2026-0005", billId: "00000000-0000-4000-8000-000000000948", method: "CHECK" as PaymentMethod, date: "2026-05-05", partial: true },
  { id: "00000000-0000-4000-8000-000000000965", paymentNumber: "VP-2026-0006", billId: "00000000-0000-4000-8000-000000000946", method: "BANK_TRANSFER" as PaymentMethod, date: "2026-04-25", partial: true },
  { id: "00000000-0000-4000-8000-000000000966", paymentNumber: "VP-2026-0007", billId: "00000000-0000-4000-8000-000000000947", method: "BANK_TRANSFER" as PaymentMethod, date: "2026-05-10", partial: true },
  { id: "00000000-0000-4000-8000-000000000967", paymentNumber: "VP-2026-0008", billId: "00000000-0000-4000-8000-000000000944", method: "CASH" as PaymentMethod, date: "2026-03-20" },
  { id: "00000000-0000-4000-8000-000000000968", paymentNumber: "VP-2026-0009", billId: "00000000-0000-4000-8000-000000000945", method: "BANK_TRANSFER" as PaymentMethod, date: "2026-04-10" },
  { id: "00000000-0000-4000-8000-000000000969", paymentNumber: "VP-2026-0010", billId: "00000000-0000-4000-8000-000000000949", method: "CARD" as PaymentMethod, date: "2026-05-01", partial: true },
];

export async function seedFinance(prisma: PrismaClient) {
  await prisma.customerPayment.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.vendorPayment.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.customerInvoiceLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.vendorBillLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.customerInvoice.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.vendorBill.deleteMany({ where: { organizationId: ORG_ID } });

  const invoiceRecords = new Map<string, { id: string; customerId: string; total: number }>();
  const billRecords = new Map<string, { id: string; vendorId: string; total: number }>();

  for (const seed of INVOICE_SEEDS) {
    const so = await prisma.salesOrder.findFirstOrThrow({
      where: { id: seed.salesOrderId, organizationId: ORG_ID },
      include: { lines: { include: { product: true } } },
    });

    const invoice = await prisma.customerInvoice.create({
      data: {
        id: seed.id,
        organizationId: ORG_ID,
        customerId: so.customerId,
        salesOrderId: so.id,
        invoiceNumber: seed.invoiceNumber,
        status: seed.status,
        invoiceDate: new Date(seed.invoiceDate),
        dueDate: new Date(seed.dueDate),
        subtotal: so.subtotal,
        taxAmount: so.taxAmount,
        totalAmount: so.totalAmount,
        amountPaid: 0,
        notes: seed.notes ?? null,
        sentAt: seed.status !== "DRAFT" && seed.status !== "VOID" ? new Date(seed.invoiceDate) : null,
        createdById: FINANCE_USER_ID,
        lines: {
          create: so.lines.map((line) => ({
            organizationId: ORG_ID,
            productId: line.productId,
            description: line.product.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          })),
        },
      },
    });

    invoiceRecords.set(seed.id, {
      id: invoice.id,
      customerId: so.customerId,
      total: Number(so.totalAmount),
    });
  }

  for (const seed of BILL_SEEDS) {
    const po = await prisma.purchaseOrder.findFirstOrThrow({
      where: { id: seed.purchaseOrderId, organizationId: ORG_ID },
      include: { lines: { include: { product: true } } },
    });

    const bill = await prisma.vendorBill.create({
      data: {
        id: seed.id,
        organizationId: ORG_ID,
        vendorId: po.vendorId,
        purchaseOrderId: po.id,
        billNumber: seed.billNumber,
        status: seed.status,
        billDate: new Date(seed.billDate),
        dueDate: new Date(seed.dueDate),
        subtotal: po.subtotal,
        taxAmount: po.taxAmount,
        totalAmount: po.totalAmount,
        amountPaid: 0,
        notes: seed.notes ?? null,
        receivedAt: seed.status !== "DRAFT" && seed.status !== "VOID" ? new Date(seed.billDate) : null,
        createdById: FINANCE_USER_ID,
        lines: {
          create: po.lines.map((line) => ({
            organizationId: ORG_ID,
            productId: line.productId,
            description: line.product.name,
            quantity: line.quantity,
            unitCost: line.unitCost,
            lineTotal: line.lineTotal,
          })),
        },
      },
    });

    billRecords.set(seed.id, {
      id: bill.id,
      vendorId: po.vendorId,
      total: Number(po.totalAmount),
    });
  }

  let cpIndex = 0;
  for (const p of CUSTOMER_PAYMENT_SEEDS) {
    const inv = invoiceRecords.get(p.invoiceId);
    if (!inv) continue;
    const amount = p.partial ? Math.round(inv.total * (cpIndex % 2 === 0 ? 0.5 : 0.4) * 100) / 100 : inv.total;

    await prisma.customerPayment.create({
      data: {
        id: p.id,
        organizationId: ORG_ID,
        customerInvoiceId: inv.id,
        customerId: inv.customerId,
        paymentNumber: p.paymentNumber,
        amount,
        paymentMethod: p.method,
        paymentDate: new Date(p.date),
        createdById: FINANCE_USER_ID,
      },
    });

    const currentPaid = await prisma.customerPayment.aggregate({
      where: { customerInvoiceId: inv.id },
      _sum: { amount: true },
    });
    const paid = Number(currentPaid._sum.amount ?? 0);
    const invRecord = await prisma.customerInvoice.findUniqueOrThrow({ where: { id: inv.id } });
    let status: InvoiceStatus = invRecord.status;
    if (paid >= inv.total - 0.01) status = "PAID";
    else if (paid > 0) status = "PARTIALLY_PAID";

    await prisma.customerInvoice.update({
      where: { id: inv.id },
      data: { amountPaid: paid, status },
    });
    cpIndex += 1;
  }

  for (const p of VENDOR_PAYMENT_SEEDS) {
    const bill = billRecords.get(p.billId);
    if (!bill) continue;
    const billRecord = await prisma.vendorBill.findUniqueOrThrow({ where: { id: bill.id } });
    const amount = p.partial
      ? Math.round(bill.total * 0.45 * 100) / 100
      : bill.total;

    await prisma.vendorPayment.create({
      data: {
        id: p.id,
        organizationId: ORG_ID,
        vendorBillId: bill.id,
        vendorId: bill.vendorId,
        paymentNumber: p.paymentNumber,
        amount,
        paymentMethod: p.method,
        paymentDate: new Date(p.date),
        createdById: FINANCE_USER_ID,
      },
    });

    const currentPaid = await prisma.vendorPayment.aggregate({
      where: { vendorBillId: bill.id },
      _sum: { amount: true },
    });
    const paid = Number(currentPaid._sum.amount ?? 0);
    let status: BillStatus = billRecord.status;
    if (paid >= bill.total - 0.01) status = "PAID";
    else if (paid > 0) status = "PARTIALLY_PAID";

    await prisma.vendorBill.update({
      where: { id: bill.id },
      data: { amountPaid: paid, status },
    });
  }

  return {
    invoices: INVOICE_SEEDS.length,
    bills: BILL_SEEDS.length,
    customerPayments: CUSTOMER_PAYMENT_SEEDS.length,
    vendorPayments: VENDOR_PAYMENT_SEEDS.length,
  };
}

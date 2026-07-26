import { PrismaClient, CustomerType, SalesOrderStatus } from "@prisma/client";
import { WAREHOUSE_IDS } from "./seed-inventory.js";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CEO_USER_ID = "00000000-0000-4000-8000-000000000020";
const SALES_USER_ID = "00000000-0000-4000-8000-000000000023";

const CUSTOMERS: Array<{
  id: string;
  code: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  customerType: CustomerType;
  paymentTerms: string;
  creditLimit: number;
  isActive: boolean;
}> = [
  { id: "00000000-0000-4000-8000-000000000600", code: "CUS-001", name: "Amman Supermarket Chain", contactName: "Faisal Rawashdeh", email: "orders@ammansuper.jo", phone: "+962 6 560 0101", city: "Amman", customerType: "RETAILER", paymentTerms: "Net 15", creditLimit: 15000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000601", code: "CUS-002", name: "Irbid Family Mart", contactName: "Lina Khoury", email: "supply@irbidfamily.jo", phone: "+962 2 560 0201", city: "Irbid", customerType: "RETAILER", paymentTerms: "Net 15", creditLimit: 8000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000602", code: "CUS-003", name: "Zarqa Corner Store Group", contactName: "Mahmoud Zayed", email: "procurement@zarqacorner.jo", phone: "+962 5 560 0301", city: "Zarqa", customerType: "RETAILER", paymentTerms: "Net 30", creditLimit: 12000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000603", code: "CUS-004", name: "Salt Grocers Cooperative", contactName: "Hana Shammout", email: "orders@saltgrocers.jo", phone: "+962 5 560 0401", city: "Salt", customerType: "RETAILER", paymentTerms: "Net 15", creditLimit: 6000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000604", code: "CUS-005", name: "Ajloun Village Market", contactName: "Yousef Qudah", email: "sales@ajlounmarket.jo", phone: "+962 2 560 0501", city: "Ajloun", customerType: "RETAILER", paymentTerms: "COD", creditLimit: 3000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000605", code: "CUS-006", name: "Levant Wholesale Trading", contactName: "Basem Haddad", email: "orders@levantwholesale.jo", phone: "+962 6 560 0601", city: "Amman", customerType: "WHOLESALER", paymentTerms: "Net 30", creditLimit: 50000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000606", code: "CUS-007", name: "Northern Jordan Distributors", contactName: "Rami Odeh", email: "b2b@northerndist.jo", phone: "+962 2 560 0701", city: "Irbid", customerType: "DISTRIBUTOR", paymentTerms: "Net 45", creditLimit: 75000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000607", code: "CUS-008", name: "East Amman Bulk Supply", contactName: "Dina Masri", email: "procurement@eastbulk.jo", phone: "+962 6 560 0801", city: "Zarqa", customerType: "WHOLESALER", paymentTerms: "Net 30", creditLimit: 40000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000608", code: "CUS-009", name: "Dead Sea Hotels Group", contactName: "George Khoury", email: "supply@deadseahotels.jo", phone: "+962 5 560 0901", city: "Amman", customerType: "CORPORATE", paymentTerms: "Net 60", creditLimit: 100000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000609", code: "CUS-010", name: "Jordan University Cafeteria Services", contactName: "Nadia Saleh", email: "orders@ju-cafe.jo", phone: "+962 6 560 1001", city: "Amman", customerType: "CORPORATE", paymentTerms: "Net 30", creditLimit: 25000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000610", code: "CUS-011", name: "Irbid Hospital Supply", contactName: "Dr. Sami Awad", email: "procurement@irbidhospital.jo", phone: "+962 2 560 1101", city: "Irbid", customerType: "CORPORATE", paymentTerms: "Net 45", creditLimit: 35000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000611", code: "CUS-012", name: "Zarqa Industrial Canteen", contactName: "Ali Jaber", email: "orders@zarqacanteen.jo", phone: "+962 5 560 1201", city: "Zarqa", customerType: "CORPORATE", paymentTerms: "Net 30", creditLimit: 18000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000612", code: "CUS-013", name: "Royal Catering JO", contactName: "Majeda Toukan", email: "events@royalcatering.jo", phone: "+962 6 560 1301", city: "Amman", customerType: "CORPORATE", paymentTerms: "Net 30", creditLimit: 45000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000613", code: "CUS-014", name: "Hillside Mini Markets", contactName: "Tareq Bani", email: "orders@hillsidemini.jo", phone: "+962 5 560 1401", city: "Salt", customerType: "RETAILER", paymentTerms: "Net 15", creditLimit: 5000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000614", code: "CUS-015", name: "Ajloun Organic Foods", contactName: "Rana Khader", email: "sales@ajlounorganic.jo", phone: "+962 2 560 1501", city: "Ajloun", customerType: "RETAILER", paymentTerms: "COD", creditLimit: 4000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000615", code: "CUS-016", name: "King Hussein Foundation Stores", contactName: "Suhail Nimri", email: "procurement@khf.jo", phone: "+962 6 560 1601", city: "Amman", customerType: "CORPORATE", paymentTerms: "Net 45", creditLimit: 30000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000616", code: "CUS-017", name: "Petra Route Trading", contactName: "Khalil Majali", email: "b2b@petraroute.jo", phone: "+962 3 560 1701", city: "Amman", customerType: "DISTRIBUTOR", paymentTerms: "Net 30", creditLimit: 60000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000617", code: "CUS-018", name: "Balqa Wholesale Center", contactName: "Issam Hamdan", email: "orders@balqawholesale.jo", phone: "+962 5 560 1801", city: "Salt", customerType: "WHOLESALER", paymentTerms: "Net 30", creditLimit: 35000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000618", code: "CUS-019", name: "FastTrack Convenience JO", contactName: "Mona Darwish", email: "supply@fasttrack.jo", phone: "+962 6 560 1901", city: "Amman", customerType: "RETAILER", paymentTerms: "Net 15", creditLimit: 10000, isActive: true },
  { id: "00000000-0000-4000-8000-000000000619", code: "CUS-020", name: "Legacy Retail Account", contactName: "Closed Account", email: "archive@legacyretail.jo", phone: "+962 6 560 1999", city: "Amman", customerType: "RETAILER", paymentTerms: "Net 60", creditLimit: 0, isActive: false },
];

type SoLineSeed = { sku: string; quantity: number; unitPrice?: number };

type SoSeed = {
  id: string;
  soNumber: string;
  customerCode: string;
  warehouseKey: keyof typeof WAREHOUSE_IDS;
  status: SalesOrderStatus;
  orderDate: string;
  expectedDeliveryDate?: string;
  notes?: string;
  createdById: string;
  lines: SoLineSeed[];
};

const SALES_ORDERS: SoSeed[] = [
  { id: "00000000-0000-4000-8000-000000000620", soNumber: "SO-2026-0001", customerCode: "CUS-001", warehouseKey: "amman", status: "INVOICED", orderDate: "2026-01-05", expectedDeliveryDate: "2026-01-10", notes: "Weekly restock — beverages", createdById: SALES_USER_ID, lines: [{ sku: "FMCG-001", quantity: 120 }, { sku: "FMCG-002", quantity: 80 }, { sku: "FMCG-003", quantity: 60 }] },
  { id: "00000000-0000-4000-8000-000000000621", soNumber: "SO-2026-0002", customerCode: "CUS-006", warehouseKey: "amman", status: "INVOICED", orderDate: "2026-01-10", expectedDeliveryDate: "2026-01-14", createdById: CEO_USER_ID, lines: [{ sku: "GRC-010", quantity: 200 }, { sku: "GRC-011", quantity: 300 }, { sku: "GRC-012", quantity: 150 }] },
  { id: "00000000-0000-4000-8000-000000000622", soNumber: "SO-2026-0003", customerCode: "CUS-002", warehouseKey: "irbid", status: "INVOICED", orderDate: "2026-01-15", expectedDeliveryDate: "2026-01-18", createdById: SALES_USER_ID, lines: [{ sku: "DRY-020", quantity: 90 }, { sku: "DRY-021", quantity: 70 }] },
  { id: "00000000-0000-4000-8000-000000000623", soNumber: "SO-2026-0004", customerCode: "CUS-009", warehouseKey: "amman", status: "INVOICED", orderDate: "2026-02-01", expectedDeliveryDate: "2026-02-05", notes: "Hotel minibar replenishment", createdById: CEO_USER_ID, lines: [{ sku: "FMCG-001", quantity: 200 }, { sku: "PC-040", quantity: 100 }, { sku: "PC-041", quantity: 80 }] },
  { id: "00000000-0000-4000-8000-000000000624", soNumber: "SO-2026-0005", customerCode: "CUS-007", warehouseKey: "irbid", status: "INVOICED", orderDate: "2026-02-08", expectedDeliveryDate: "2026-02-12", createdById: SALES_USER_ID, lines: [{ sku: "HHL-030", quantity: 150 }, { sku: "HHL-031", quantity: 120 }, { sku: "HHL-032", quantity: 90 }, { sku: "GRC-010", quantity: 100 }] },
  { id: "00000000-0000-4000-8000-000000000625", soNumber: "SO-2026-0006", customerCode: "CUS-003", warehouseKey: "amman", status: "DELIVERED", orderDate: "2026-03-01", expectedDeliveryDate: "2026-03-05", createdById: SALES_USER_ID, lines: [{ sku: "GRC-011", quantity: 180 }, { sku: "GRC-012", quantity: 120 }] },
  { id: "00000000-0000-4000-8000-000000000626", soNumber: "SO-2026-0007", customerCode: "CUS-010", warehouseKey: "amman", status: "DELIVERED", orderDate: "2026-03-05", expectedDeliveryDate: "2026-03-08", notes: "Campus cafeteria order", createdById: SALES_USER_ID, lines: [{ sku: "FMCG-001", quantity: 150 }, { sku: "DRY-020", quantity: 100 }, { sku: "GRC-010", quantity: 80 }] },
  { id: "00000000-0000-4000-8000-000000000627", soNumber: "SO-2026-0008", customerCode: "CUS-004", warehouseKey: "amman", status: "DELIVERED", orderDate: "2026-03-10", expectedDeliveryDate: "2026-03-14", createdById: SALES_USER_ID, lines: [{ sku: "HHL-030", quantity: 60 }, { sku: "HHL-031", quantity: 50 }] },
  { id: "00000000-0000-4000-8000-000000000628", soNumber: "SO-2026-0009", customerCode: "CUS-011", warehouseKey: "irbid", status: "DELIVERED", orderDate: "2026-03-15", expectedDeliveryDate: "2026-03-18", createdById: CEO_USER_ID, lines: [{ sku: "PC-040", quantity: 80 }, { sku: "PC-041", quantity: 60 }, { sku: "HHL-032", quantity: 40 }] },
  { id: "00000000-0000-4000-8000-000000000629", soNumber: "SO-2026-0010", customerCode: "CUS-008", warehouseKey: "amman", status: "READY_TO_SHIP", orderDate: "2026-04-01", expectedDeliveryDate: "2026-06-22", createdById: SALES_USER_ID, lines: [{ sku: "GRC-010", quantity: 400 }, { sku: "GRC-011", quantity: 350 }, { sku: "GRC-012", quantity: 200 }] },
  { id: "00000000-0000-4000-8000-000000000630", soNumber: "SO-2026-0011", customerCode: "CUS-017", warehouseKey: "amman", status: "READY_TO_SHIP", orderDate: "2026-04-05", expectedDeliveryDate: "2026-06-25", createdById: CEO_USER_ID, lines: [{ sku: "FMCG-002", quantity: 300 }, { sku: "FMCG-003", quantity: 250 }] },
  { id: "00000000-0000-4000-8000-000000000631", soNumber: "SO-2026-0012", customerCode: "CUS-005", warehouseKey: "irbid", status: "READY_TO_SHIP", orderDate: "2026-04-08", expectedDeliveryDate: "2026-06-20", createdById: SALES_USER_ID, lines: [{ sku: "DRY-020", quantity: 50 }, { sku: "DRY-021", quantity: 40 }, { sku: "GRC-012", quantity: 30 }] },
  { id: "00000000-0000-4000-8000-000000000632", soNumber: "SO-2026-0013", customerCode: "CUS-012", warehouseKey: "amman", status: "PICKING", orderDate: "2026-05-01", expectedDeliveryDate: "2026-06-18", createdById: SALES_USER_ID, lines: [{ sku: "FMCG-001", quantity: 100 }, { sku: "GRC-011", quantity: 80 }, { sku: "HHL-030", quantity: 60 }] },
  { id: "00000000-0000-4000-8000-000000000633", soNumber: "SO-2026-0014", customerCode: "CUS-013", warehouseKey: "amman", status: "PICKING", orderDate: "2026-05-05", expectedDeliveryDate: "2026-06-20", notes: "Event catering supplies", createdById: CEO_USER_ID, lines: [{ sku: "FMCG-003", quantity: 120 }, { sku: "PC-040", quantity: 90 }, { sku: "PC-041", quantity: 70 }, { sku: "DRY-020", quantity: 50 }] },
  { id: "00000000-0000-4000-8000-000000000634", soNumber: "SO-2026-0015", customerCode: "CUS-014", warehouseKey: "amman", status: "PICKING", orderDate: "2026-05-08", expectedDeliveryDate: "2026-06-15", createdById: SALES_USER_ID, lines: [{ sku: "HHL-031", quantity: 45 }, { sku: "HHL-032", quantity: 35 }] },
  { id: "00000000-0000-4000-8000-000000000635", soNumber: "SO-2026-0016", customerCode: "CUS-016", warehouseKey: "amman", status: "CONFIRMED", orderDate: "2026-05-15", expectedDeliveryDate: "2026-06-28", createdById: SALES_USER_ID, lines: [{ sku: "ELC-050", quantity: 20 }, { sku: "ELC-051", quantity: 15 }] },
  { id: "00000000-0000-4000-8000-000000000636", soNumber: "SO-2026-0017", customerCode: "CUS-018", warehouseKey: "amman", status: "CONFIRMED", orderDate: "2026-05-18", expectedDeliveryDate: "2026-06-30", createdById: SALES_USER_ID, lines: [{ sku: "GRC-010", quantity: 250 }, { sku: "GRC-011", quantity: 200 }, { sku: "DRY-020", quantity: 100 }] },
  { id: "00000000-0000-4000-8000-000000000637", soNumber: "SO-2026-0018", customerCode: "CUS-019", warehouseKey: "irbid", status: "CONFIRMED", orderDate: "2026-05-20", expectedDeliveryDate: "2026-07-02", createdById: SALES_USER_ID, lines: [{ sku: "FMCG-001", quantity: 80 }, { sku: "FMCG-002", quantity: 60 }] },
  { id: "00000000-0000-4000-8000-000000000638", soNumber: "SO-2026-0019", customerCode: "CUS-015", warehouseKey: "irbid", status: "CONFIRMED", orderDate: "2026-05-22", expectedDeliveryDate: "2026-07-05", createdById: CEO_USER_ID, lines: [{ sku: "GRC-012", quantity: 40 }, { sku: "DRY-021", quantity: 30 }, { sku: "HHL-030", quantity: 25 }] },
  { id: "00000000-0000-4000-8000-000000000639", soNumber: "SO-2026-0020", customerCode: "CUS-001", warehouseKey: "amman", status: "DRAFT", orderDate: "2026-06-01", expectedDeliveryDate: "2026-07-10", notes: "Draft — pending customer confirmation", createdById: SALES_USER_ID, lines: [{ sku: "FMCG-001", quantity: 200 }, { sku: "FMCG-002", quantity: 100 }] },
  { id: "00000000-0000-4000-8000-000000000640", soNumber: "SO-2026-0021", customerCode: "CUS-006", warehouseKey: "amman", status: "DRAFT", orderDate: "2026-06-03", createdById: SALES_USER_ID, lines: [{ sku: "GRC-010", quantity: 300 }, { sku: "GRC-011", quantity: 250 }, { sku: "HHL-031", quantity: 100 }] },
  { id: "00000000-0000-4000-8000-000000000641", soNumber: "SO-2026-0022", customerCode: "CUS-009", warehouseKey: "amman", status: "DRAFT", orderDate: "2026-06-05", expectedDeliveryDate: "2026-07-15", createdById: CEO_USER_ID, lines: [{ sku: "PC-040", quantity: 150 }, { sku: "PC-041", quantity: 120 }, { sku: "ELC-050", quantity: 10 }] },
  { id: "00000000-0000-4000-8000-000000000642", soNumber: "SO-2026-0023", customerCode: "CUS-020", warehouseKey: "amman", status: "CANCELLED", orderDate: "2026-02-15", notes: "Cancelled — customer deactivated", createdById: SALES_USER_ID, lines: [{ sku: "GRC-011", quantity: 50 }, { sku: "GRC-012", quantity: 40 }] },
  { id: "00000000-0000-4000-8000-000000000643", soNumber: "SO-2026-0024", customerCode: "CUS-003", warehouseKey: "amman", status: "CANCELLED", orderDate: "2026-03-20", notes: "Cancelled — duplicate order", createdById: SALES_USER_ID, lines: [{ sku: "FMCG-001", quantity: 60 }, { sku: "DRY-020", quantity: 40 }, { sku: "HHL-030", quantity: 30 }, { sku: "PC-040", quantity: 20 }] },
];

function calcTotals(lines: Array<{ quantity: number; unitPrice: number }>) {
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxAmount = Math.round(subtotal * 0.16 * 100) / 100;
  return { subtotal, taxAmount, totalAmount: subtotal + taxAmount };
}

export async function seedSales(prisma: PrismaClient) {
  await prisma.salesOrderLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.salesOrder.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.customer.deleteMany({ where: { organizationId: ORG_ID } });

  for (const customer of CUSTOMERS) {
    await prisma.customer.create({
      data: {
        id: customer.id,
        organizationId: ORG_ID,
        code: customer.code,
        name: customer.name,
        contactName: customer.contactName,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        customerType: customer.customerType,
        paymentTerms: customer.paymentTerms,
        creditLimit: customer.creditLimit,
        isActive: customer.isActive,
      },
    });
  }

  const products = await prisma.product.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, sku: true, sellPrice: true },
  });
  const productBySku = new Map(products.map((p) => [p.sku, p]));
  const customerByCode = new Map(CUSTOMERS.map((c) => [c.code, c.id]));

  let lineSeq = 0;

  for (const so of SALES_ORDERS) {
    const customerId = customerByCode.get(so.customerCode);
    if (!customerId) continue;

    const resolvedLines = so.lines.map((line) => {
      const product = productBySku.get(line.sku);
      if (!product) throw new Error(`Product ${line.sku} not found for ${so.soNumber}`);
      const unitPrice = line.unitPrice ?? Number(product.sellPrice);
      const lineTotal = line.quantity * unitPrice;
      lineSeq += 1;
      return {
        id: `00000000-0000-4000-8000-0000000007${String(lineSeq).padStart(2, "0")}`,
        organizationId: ORG_ID,
        productId: product.id,
        quantity: line.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const totals = calcTotals(
      resolvedLines.map((l) => ({ quantity: l.quantity, unitPrice: Number(l.unitPrice) }))
    );

    await prisma.salesOrder.create({
      data: {
        id: so.id,
        organizationId: ORG_ID,
        customerId,
        warehouseId: WAREHOUSE_IDS[so.warehouseKey],
        soNumber: so.soNumber,
        status: so.status,
        orderDate: new Date(so.orderDate),
        expectedDeliveryDate: so.expectedDeliveryDate ? new Date(so.expectedDeliveryDate) : null,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        notes: so.notes ?? null,
        createdById: so.createdById,
        lines: {
          create: resolvedLines.map(({ id, organizationId, productId, quantity, unitPrice, lineTotal }) => ({
            id,
            organizationId,
            productId,
            quantity,
            unitPrice,
            lineTotal,
          })),
        },
      },
    });
  }

  console.log(`  Sales: ${CUSTOMERS.length} customers, ${SALES_ORDERS.length} sales orders`);
}

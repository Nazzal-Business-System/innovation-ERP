import { PrismaClient, PurchaseOrderStatus } from "@prisma/client";
import { WAREHOUSE_IDS } from "./seed-inventory.js";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CEO_USER_ID = "00000000-0000-4000-8000-000000000020";
const INVENTORY_USER_ID = "00000000-0000-4000-8000-000000000022";

const VENDORS = [
  {
    id: "00000000-0000-4000-8000-000000000300",
    code: "VND-001",
    name: "Jordan Beverages Co.",
    contactName: "Ahmad Al-Khatib",
    email: "orders@jordanbeverages.jo",
    phone: "+962 6 555 0101",
    city: "Amman",
    paymentTerms: "Net 30",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000301",
    code: "VND-002",
    name: "Gulf Refreshments Ltd.",
    contactName: "Sara Momani",
    email: "procurement@gulfrefresh.jo",
    phone: "+962 6 555 0102",
    city: "Amman",
    paymentTerms: "Net 45",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000302",
    code: "VND-003",
    name: "Levant Grocery Suppliers",
    contactName: "Omar Haddad",
    email: "sales@levantgrocery.jo",
    phone: "+962 5 555 0201",
    city: "Zarqa",
    paymentTerms: "Net 30",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000303",
    code: "VND-004",
    name: "Mediterranean Foods Trading",
    contactName: "Layla Nassar",
    email: "orders@medfoods.jo",
    phone: "+962 6 555 0301",
    city: "Amman",
    paymentTerms: "Net 60",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000304",
    code: "VND-005",
    name: "Badia Dairy Farms",
    contactName: "Khalid Omari",
    email: "supply@badiadairy.jo",
    phone: "+962 2 555 0401",
    city: "Irbid",
    paymentTerms: "Net 15",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000305",
    code: "VND-006",
    name: "Northern Dairy Collective",
    contactName: "Rania Sweiss",
    email: "procurement@ndairy.jo",
    phone: "+962 6 555 0402",
    city: "Amman",
    paymentTerms: "Net 30",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000306",
    code: "VND-007",
    name: "CleanHome Jordan",
    contactName: "Fadi Khoury",
    email: "orders@cleanhome.jo",
    phone: "+962 6 555 0501",
    city: "Amman",
    paymentTerms: "Net 30",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000307",
    code: "VND-008",
    name: "Sparkle Hygiene Products",
    contactName: "Maha Qasem",
    email: "sales@sparklehygiene.jo",
    phone: "+962 3 555 0601",
    city: "Aqaba",
    paymentTerms: "Net 45",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000308",
    code: "VND-009",
    name: "TechSource Electronics JO",
    contactName: "Yazan Bitawi",
    email: "b2b@techsource.jo",
    phone: "+962 6 555 0701",
    city: "Amman",
    paymentTerms: "Net 30",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000309",
    code: "VND-010",
    name: "Amman Packaging Solutions",
    contactName: "Hani Saleh",
    email: "orders@ammanpack.jo",
    phone: "+962 6 555 0801",
    city: "Amman",
    paymentTerms: "Net 30",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000310",
    code: "VND-011",
    name: "Irbid Wholesale Group",
    contactName: "Nour Abed",
    email: "procurement@irbidwholesale.jo",
    phone: "+962 2 555 0901",
    city: "Irbid",
    paymentTerms: "Net 15",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000311",
    code: "VND-012",
    name: "Legacy Foods Supplier",
    contactName: "Tariq Mansour",
    email: "archive@legacyfoods.jo",
    phone: "+962 6 555 0999",
    city: "Amman",
    paymentTerms: "Net 60",
    isActive: false,
  },
];

type PoLineSeed = { sku: string; quantity: number; unitCost?: number };

type PoSeed = {
  id: string;
  poNumber: string;
  vendorCode: string;
  warehouseKey: keyof typeof WAREHOUSE_IDS;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
  createdById: string;
  lines: PoLineSeed[];
};

const PURCHASE_ORDERS: PoSeed[] = [
  {
    id: "00000000-0000-4000-8000-000000000400",
    poNumber: "PO-2026-0001",
    vendorCode: "VND-001",
    warehouseKey: "amman",
    status: "RECEIVED",
    orderDate: "2026-01-08",
    expectedDate: "2026-01-15",
    notes: "Q1 beverage restock — Amman DC",
    createdById: INVENTORY_USER_ID,
    lines: [
      { sku: "FMCG-001", quantity: 500 },
      { sku: "FMCG-002", quantity: 200 },
      { sku: "FMCG-003", quantity: 150 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000401",
    poNumber: "PO-2026-0002",
    vendorCode: "VND-003",
    warehouseKey: "amman",
    status: "RECEIVED",
    orderDate: "2026-01-12",
    expectedDate: "2026-01-20",
    notes: "Cooking oil and rice promotion stock",
    createdById: CEO_USER_ID,
    lines: [
      { sku: "GRC-010", quantity: 300 },
      { sku: "GRC-011", quantity: 400 },
      { sku: "GRC-012", quantity: 250 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000402",
    poNumber: "PO-2026-0003",
    vendorCode: "VND-005",
    warehouseKey: "irbid",
    status: "RECEIVED",
    orderDate: "2026-01-18",
    expectedDate: "2026-01-22",
    notes: "Irbid branch dairy replenishment",
    createdById: INVENTORY_USER_ID,
    lines: [
      { sku: "DRY-020", quantity: 180 },
      { sku: "DRY-021", quantity: 120 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000403",
    poNumber: "PO-2026-0004",
    vendorCode: "VND-007",
    warehouseKey: "amman",
    status: "RECEIVED",
    orderDate: "2026-02-01",
    expectedDate: "2026-02-08",
    createdById: INVENTORY_USER_ID,
    lines: [
      { sku: "HHL-030", quantity: 200 },
      { sku: "HHL-031", quantity: 150 },
      { sku: "HHL-032", quantity: 100 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000404",
    poNumber: "PO-2026-0005",
    vendorCode: "VND-009",
    warehouseKey: "amman",
    status: "RECEIVED",
    orderDate: "2026-02-10",
    expectedDate: "2026-02-18",
    notes: "Electronics shelf refresh",
    createdById: CEO_USER_ID,
    lines: [
      { sku: "ELC-050", quantity: 40 },
      { sku: "ELC-051", quantity: 35 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000405",
    poNumber: "PO-2026-0006",
    vendorCode: "VND-002",
    warehouseKey: "amman",
    status: "APPROVED",
    orderDate: "2026-03-01",
    expectedDate: "2026-06-25",
    notes: "Summer beverage pre-order",
    createdById: INVENTORY_USER_ID,
    lines: [
      { sku: "FMCG-001", quantity: 800 },
      { sku: "FMCG-002", quantity: 400 },
      { sku: "FMCG-003", quantity: 300 },
      { sku: "FMCG-002", quantity: 100, unitCost: 7.9 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000406",
    poNumber: "PO-2026-0007",
    vendorCode: "VND-004",
    warehouseKey: "amman",
    status: "APPROVED",
    orderDate: "2026-03-05",
    expectedDate: "2026-06-22",
    createdById: CEO_USER_ID,
    lines: [
      { sku: "GRC-010", quantity: 500 },
      { sku: "GRC-011", quantity: 600 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000407",
    poNumber: "PO-2026-0008",
    vendorCode: "VND-006",
    warehouseKey: "irbid",
    status: "APPROVED",
    orderDate: "2026-03-08",
    expectedDate: "2026-06-20",
    notes: "Ramadan dairy buildup",
    createdById: INVENTORY_USER_ID,
    lines: [
      { sku: "DRY-020", quantity: 350 },
      { sku: "DRY-021", quantity: 200 },
      { sku: "DRY-020", quantity: 100, unitCost: 5.4 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000408",
    poNumber: "PO-2026-0009",
    vendorCode: "VND-008",
    warehouseKey: "amman",
    status: "APPROVED",
    orderDate: "2026-03-12",
    expectedDate: "2026-06-28",
    createdById: INVENTORY_USER_ID,
    lines: [
      { sku: "PC-040", quantity: 220 },
      { sku: "PC-041", quantity: 180 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000409",
    poNumber: "PO-2026-0010",
    vendorCode: "VND-001",
    warehouseKey: "irbid",
    status: "PARTIALLY_RECEIVED",
    orderDate: "2026-04-01",
    expectedDate: "2026-06-18",
    notes: "Partial delivery received — balance pending",
    createdById: INVENTORY_USER_ID,
    lines: [
      { sku: "FMCG-001", quantity: 300 },
      { sku: "FMCG-003", quantity: 200 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000410",
    poNumber: "PO-2026-0011",
    vendorCode: "VND-010",
    warehouseKey: "amman",
    status: "PARTIALLY_RECEIVED",
    orderDate: "2026-04-05",
    expectedDate: "2026-06-15",
    createdById: CEO_USER_ID,
    lines: [
      { sku: "GRC-012", quantity: 400 },
      { sku: "HHL-032", quantity: 150 },
      { sku: "GRC-011", quantity: 200 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000411",
    poNumber: "PO-2026-0012",
    vendorCode: "VND-003",
    warehouseKey: "amman",
    status: "SENT",
    orderDate: "2026-05-20",
    expectedDate: "2026-06-30",
    notes: "Awaiting vendor confirmation",
    createdById: INVENTORY_USER_ID,
    lines: [
      { sku: "GRC-010", quantity: 250 },
      { sku: "GRC-011", quantity: 300 },
      { sku: "GRC-012", quantity: 180 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000412",
    poNumber: "PO-2026-0013",
    vendorCode: "VND-011",
    warehouseKey: "irbid",
    status: "SENT",
    orderDate: "2026-05-22",
    expectedDate: "2026-07-05",
    createdById: INVENTORY_USER_ID,
    lines: [
      { sku: "FMCG-001", quantity: 150 },
      { sku: "DRY-020", quantity: 100 },
      { sku: "HHL-030", quantity: 80 },
      { sku: "PC-040", quantity: 60 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000413",
    poNumber: "PO-2026-0014",
    vendorCode: "VND-009",
    warehouseKey: "amman",
    status: "SENT",
    orderDate: "2026-05-25",
    expectedDate: "2026-07-10",
    createdById: CEO_USER_ID,
    lines: [
      { sku: "ELC-050", quantity: 25 },
      { sku: "ELC-051", quantity: 20 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000414",
    poNumber: "PO-2026-0015",
    vendorCode: "VND-002",
    warehouseKey: "amman",
    status: "DRAFT",
    orderDate: "2026-06-01",
    expectedDate: "2026-07-15",
    notes: "Draft — pending line review",
    createdById: INVENTORY_USER_ID,
    lines: [
      { sku: "FMCG-002", quantity: 300 },
      { sku: "FMCG-003", quantity: 200 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000415",
    poNumber: "PO-2026-0016",
    vendorCode: "VND-007",
    warehouseKey: "irbid",
    status: "DRAFT",
    orderDate: "2026-06-05",
    createdById: INVENTORY_USER_ID,
    lines: [
      { sku: "HHL-031", quantity: 120 },
      { sku: "HHL-032", quantity: 90 },
      { sku: "PC-041", quantity: 70 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000416",
    poNumber: "PO-2026-0017",
    vendorCode: "VND-012",
    warehouseKey: "amman",
    status: "CANCELLED",
    orderDate: "2026-02-20",
    notes: "Cancelled — vendor deactivated",
    createdById: CEO_USER_ID,
    lines: [
      { sku: "GRC-011", quantity: 200 },
      { sku: "GRC-012", quantity: 150 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000417",
    poNumber: "PO-2026-0018",
    vendorCode: "VND-004",
    warehouseKey: "amman",
    status: "CANCELLED",
    orderDate: "2026-03-20",
    notes: "Cancelled — duplicate order",
    createdById: INVENTORY_USER_ID,
    lines: [
      { sku: "GRC-010", quantity: 100 },
      { sku: "GRC-011", quantity: 100 },
      { sku: "GRC-012", quantity: 100 },
      { sku: "DRY-020", quantity: 50 },
      { sku: "HHL-030", quantity: 50 },
      { sku: "PC-040", quantity: 30 },
    ],
  },
];

function calcTotals(lines: Array<{ quantity: number; unitCost: number }>) {
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const taxAmount = Math.round(subtotal * 0.16 * 100) / 100;
  return { subtotal, taxAmount, totalAmount: subtotal + taxAmount };
}

export async function seedProcurement(prisma: PrismaClient) {
  await prisma.purchaseOrderLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.purchaseOrder.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.vendor.deleteMany({ where: { organizationId: ORG_ID } });

  for (const vendor of VENDORS) {
    await prisma.vendor.create({
      data: {
        id: vendor.id,
        organizationId: ORG_ID,
        ...vendor,
      },
    });
  }

  const products = await prisma.product.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, sku: true, costPrice: true },
  });
  const productBySku = new Map(products.map((p) => [p.sku, p]));
  const vendorByCode = new Map(VENDORS.map((v) => [v.code, v.id]));

  let lineSeq = 0;

  for (const po of PURCHASE_ORDERS) {
    const vendorId = vendorByCode.get(po.vendorCode);
    if (!vendorId) continue;

    const resolvedLines = po.lines.map((line) => {
      const product = productBySku.get(line.sku);
      if (!product) throw new Error(`Product ${line.sku} not found for ${po.poNumber}`);
      const unitCost = line.unitCost ?? Number(product.costPrice);
      const lineTotal = line.quantity * unitCost;
      lineSeq += 1;
      return {
        id: `00000000-0000-4000-8000-0000000005${String(lineSeq).padStart(2, "0")}`,
        organizationId: ORG_ID,
        productId: product.id,
        quantity: line.quantity,
        unitCost,
        lineTotal,
      };
    });

    const totals = calcTotals(
      resolvedLines.map((l) => ({ quantity: l.quantity, unitCost: Number(l.unitCost) }))
    );

    await prisma.purchaseOrder.create({
      data: {
        id: po.id,
        organizationId: ORG_ID,
        vendorId,
        warehouseId: WAREHOUSE_IDS[po.warehouseKey],
        poNumber: po.poNumber,
        status: po.status,
        orderDate: new Date(po.orderDate),
        expectedDate: po.expectedDate ? new Date(po.expectedDate) : null,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        notes: po.notes ?? null,
        createdById: po.createdById,
        lines: {
          create: resolvedLines.map(({ id, organizationId, productId, quantity, unitCost, lineTotal }) => ({
            id,
            organizationId,
            productId,
            quantity,
            unitCost,
            lineTotal,
          })),
        },
      },
    });
  }

  console.log(`  Procurement: ${VENDORS.length} vendors, ${PURCHASE_ORDERS.length} purchase orders`);
}

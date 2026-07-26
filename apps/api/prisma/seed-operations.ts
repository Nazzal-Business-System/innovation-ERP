import { PrismaClient } from "@prisma/client";
import { WAREHOUSE_IDS } from "./seed-inventory.js";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CEO_USER_ID = "00000000-0000-4000-8000-000000000020";
const INVENTORY_USER_ID = "00000000-0000-4000-8000-000000000022";
const SALES_USER_ID = "00000000-0000-4000-8000-000000000023";

type GrLineSeed = {
  sku: string;
  orderedQuantity: number;
  receivedQuantity: number;
  rejectedQuantity?: number;
};

type GrSeed = {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  warehouseKey: keyof typeof WAREHOUSE_IDS;
  status: "DRAFT" | "RECEIVED" | "CANCELLED";
  receivedDate?: string;
  receivedById?: string;
  notes?: string;
  lines: GrLineSeed[];
};

type DlLineSeed = {
  sku: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  returnedQuantity?: number;
};

type DlSeed = {
  id: string;
  deliveryNumber: string;
  salesOrderId: string;
  warehouseKey: keyof typeof WAREHOUSE_IDS;
  status: "DRAFT" | "PICKED" | "DELIVERED" | "CANCELLED";
  deliveryDate?: string;
  deliveredById?: string;
  notes?: string;
  lines: DlLineSeed[];
};

const GOODS_RECEIPTS: GrSeed[] = [
  {
    id: "00000000-0000-4000-8000-000000000700",
    receiptNumber: "GR-2026-0001",
    purchaseOrderId: "00000000-0000-4000-8000-000000000400",
    warehouseKey: "amman",
    status: "RECEIVED",
    receivedDate: "2026-01-16",
    receivedById: INVENTORY_USER_ID,
    notes: "Full receipt — Q1 beverage restock",
    lines: [
      { sku: "FMCG-001", orderedQuantity: 500, receivedQuantity: 500 },
      { sku: "FMCG-002", orderedQuantity: 200, receivedQuantity: 198, rejectedQuantity: 2 },
      { sku: "FMCG-003", orderedQuantity: 150, receivedQuantity: 150 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000701",
    receiptNumber: "GR-2026-0002",
    purchaseOrderId: "00000000-0000-4000-8000-000000000401",
    warehouseKey: "amman",
    status: "RECEIVED",
    receivedDate: "2026-01-21",
    receivedById: CEO_USER_ID,
    lines: [
      { sku: "GRC-010", orderedQuantity: 300, receivedQuantity: 300 },
      { sku: "GRC-011", orderedQuantity: 400, receivedQuantity: 400 },
      { sku: "GRC-012", orderedQuantity: 250, receivedQuantity: 250 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000702",
    receiptNumber: "GR-2026-0003",
    purchaseOrderId: "00000000-0000-4000-8000-000000000402",
    warehouseKey: "irbid",
    status: "RECEIVED",
    receivedDate: "2026-01-23",
    receivedById: INVENTORY_USER_ID,
    lines: [
      { sku: "DRY-020", orderedQuantity: 180, receivedQuantity: 180 },
      { sku: "DRY-021", orderedQuantity: 120, receivedQuantity: 118, rejectedQuantity: 2 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000703",
    receiptNumber: "GR-2026-0004",
    purchaseOrderId: "00000000-0000-4000-8000-000000000409",
    warehouseKey: "amman",
    status: "RECEIVED",
    receivedDate: "2026-04-12",
    receivedById: INVENTORY_USER_ID,
    notes: "Partial receipt — first shipment",
    lines: [
      { sku: "HHL-030", orderedQuantity: 100, receivedQuantity: 100 },
      { sku: "HHL-031", orderedQuantity: 80, receivedQuantity: 80 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000704",
    receiptNumber: "GR-2026-0005",
    purchaseOrderId: "00000000-0000-4000-8000-000000000405",
    warehouseKey: "amman",
    status: "DRAFT",
    notes: "Awaiting summer beverage shipment",
    lines: [
      { sku: "FMCG-001", orderedQuantity: 800, receivedQuantity: 800 },
      { sku: "FMCG-002", orderedQuantity: 400, receivedQuantity: 400 },
      { sku: "FMCG-003", orderedQuantity: 300, receivedQuantity: 300 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000705",
    receiptNumber: "GR-2026-0006",
    purchaseOrderId: "00000000-0000-4000-8000-000000000406",
    warehouseKey: "amman",
    status: "DRAFT",
    lines: [
      { sku: "GRC-010", orderedQuantity: 500, receivedQuantity: 500 },
      { sku: "GRC-011", orderedQuantity: 600, receivedQuantity: 600 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000706",
    receiptNumber: "GR-2026-0007",
    purchaseOrderId: "00000000-0000-4000-8000-000000000407",
    warehouseKey: "amman",
    status: "DRAFT",
    notes: "Scheduled for this week",
    lines: [
      { sku: "HHL-030", orderedQuantity: 150, receivedQuantity: 150 },
      { sku: "HHL-032", orderedQuantity: 100, receivedQuantity: 100 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000707",
    receiptNumber: "GR-2026-0008",
    purchaseOrderId: "00000000-0000-4000-8000-000000000408",
    warehouseKey: "irbid",
    status: "CANCELLED",
    notes: "Cancelled — vendor rescheduled",
    lines: [{ sku: "ELC-050", orderedQuantity: 25, receivedQuantity: 0 }],
  },
];

const DELIVERIES: DlSeed[] = [
  {
    id: "00000000-0000-4000-8000-000000000800",
    deliveryNumber: "DL-2026-0001",
    salesOrderId: "00000000-0000-4000-8000-000000000625",
    warehouseKey: "amman",
    status: "DELIVERED",
    deliveryDate: "2026-03-05",
    deliveredById: SALES_USER_ID,
    lines: [
      { sku: "GRC-011", orderedQuantity: 180, deliveredQuantity: 180 },
      { sku: "GRC-012", orderedQuantity: 120, deliveredQuantity: 120 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000801",
    deliveryNumber: "DL-2026-0002",
    salesOrderId: "00000000-0000-4000-8000-000000000626",
    warehouseKey: "amman",
    status: "DELIVERED",
    deliveryDate: "2026-03-08",
    deliveredById: SALES_USER_ID,
    notes: "Campus cafeteria delivery",
    lines: [
      { sku: "FMCG-001", orderedQuantity: 150, deliveredQuantity: 150 },
      { sku: "DRY-020", orderedQuantity: 100, deliveredQuantity: 100 },
      { sku: "GRC-010", orderedQuantity: 80, deliveredQuantity: 80 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000802",
    deliveryNumber: "DL-2026-0003",
    salesOrderId: "00000000-0000-4000-8000-000000000627",
    warehouseKey: "amman",
    status: "DELIVERED",
    deliveryDate: "2026-03-14",
    deliveredById: CEO_USER_ID,
    lines: [
      { sku: "HHL-030", orderedQuantity: 60, deliveredQuantity: 60 },
      { sku: "HHL-031", orderedQuantity: 50, deliveredQuantity: 50 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000803",
    deliveryNumber: "DL-2026-0004",
    salesOrderId: "00000000-0000-4000-8000-000000000628",
    warehouseKey: "irbid",
    status: "DELIVERED",
    deliveryDate: "2026-03-18",
    deliveredById: SALES_USER_ID,
    lines: [
      { sku: "PC-040", orderedQuantity: 80, deliveredQuantity: 80 },
      { sku: "PC-041", orderedQuantity: 60, deliveredQuantity: 60 },
      { sku: "HHL-032", orderedQuantity: 40, deliveredQuantity: 40 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000804",
    deliveryNumber: "DL-2026-0005",
    salesOrderId: "00000000-0000-4000-8000-000000000629",
    warehouseKey: "amman",
    status: "PICKED",
    notes: "Bulk wholesale — ready to ship",
    lines: [
      { sku: "GRC-010", orderedQuantity: 400, deliveredQuantity: 400 },
      { sku: "GRC-011", orderedQuantity: 350, deliveredQuantity: 350 },
      { sku: "GRC-012", orderedQuantity: 200, deliveredQuantity: 200 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000805",
    deliveryNumber: "DL-2026-0006",
    salesOrderId: "00000000-0000-4000-8000-000000000630",
    warehouseKey: "amman",
    status: "DRAFT",
    lines: [
      { sku: "FMCG-002", orderedQuantity: 300, deliveredQuantity: 300 },
      { sku: "FMCG-003", orderedQuantity: 250, deliveredQuantity: 250 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000806",
    deliveryNumber: "DL-2026-0007",
    salesOrderId: "00000000-0000-4000-8000-000000000632",
    warehouseKey: "amman",
    status: "PICKED",
    lines: [
      { sku: "FMCG-001", orderedQuantity: 100, deliveredQuantity: 100 },
      { sku: "GRC-011", orderedQuantity: 80, deliveredQuantity: 80 },
      { sku: "HHL-030", orderedQuantity: 60, deliveredQuantity: 60 },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000807",
    deliveryNumber: "DL-2026-0008",
    salesOrderId: "00000000-0000-4000-8000-000000000635",
    warehouseKey: "amman",
    status: "CANCELLED",
    notes: "Cancelled — customer postponed",
    lines: [{ sku: "ELC-050", orderedQuantity: 20, deliveredQuantity: 0 }],
  },
];

export async function seedOperations(prisma: PrismaClient) {
  const products = await prisma.product.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, sku: true },
  });
  const skuToId = new Map(products.map((p) => [p.sku, p.id]));

  await prisma.goodsReceiptLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.goodsReceipt.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.deliveryLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.delivery.deleteMany({ where: { organizationId: ORG_ID } });

  let notificationsCreated = 0;

  for (const gr of GOODS_RECEIPTS) {
    const warehouseId = WAREHOUSE_IDS[gr.warehouseKey];
    const receipt = await prisma.goodsReceipt.create({
      data: {
        id: gr.id,
        organizationId: ORG_ID,
        receiptNumber: gr.receiptNumber,
        purchaseOrderId: gr.purchaseOrderId,
        warehouseId,
        status: gr.status,
        receivedDate: gr.receivedDate ? new Date(gr.receivedDate) : null,
        receivedById: gr.receivedById ?? null,
        notes: gr.notes ?? null,
        lines: {
          create: gr.lines.map((line) => ({
            organizationId: ORG_ID,
            productId: skuToId.get(line.sku)!,
            orderedQuantity: line.orderedQuantity,
            receivedQuantity: line.receivedQuantity,
            rejectedQuantity: line.rejectedQuantity ?? 0,
          })),
        },
      },
      include: { lines: true, purchaseOrder: true, warehouse: true },
    });

    if (gr.status === "RECEIVED") {
      for (const line of receipt.lines) {
        if (line.receivedQuantity <= 0) continue;

        await prisma.stockMovement.create({
          data: {
            organizationId: ORG_ID,
            productId: line.productId,
            warehouseId,
            type: "RECEIPT",
            quantity: line.receivedQuantity,
            reference: gr.receiptNumber,
            notes: `Goods receipt from ${receipt.purchaseOrder.poNumber}`,
            createdById: gr.receivedById ?? INVENTORY_USER_ID,
            createdAt: gr.receivedDate ? new Date(gr.receivedDate) : undefined,
          },
        });

        await prisma.stockBalance.upsert({
          where: {
            productId_warehouseId: { productId: line.productId, warehouseId },
          },
          create: {
            organizationId: ORG_ID,
            productId: line.productId,
            warehouseId,
            quantityOnHand: line.receivedQuantity,
          },
          update: {
            quantityOnHand: { increment: line.receivedQuantity },
          },
        });
      }

      await prisma.notification.create({
        data: {
          organizationId: ORG_ID,
          userId: null,
          type: "SUCCESS",
          module: "PROCUREMENT",
          title: "Goods receipt completed",
          message: `${gr.receiptNumber} received for PO (seed data).`,
          entityType: "goods_receipt",
          entityId: gr.id,
          isRead: Math.random() > 0.5,
        },
      });
      notificationsCreated += 1;
    }
  }

  for (const dl of DELIVERIES) {
    const warehouseId = WAREHOUSE_IDS[dl.warehouseKey];
    const delivery = await prisma.delivery.create({
      data: {
        id: dl.id,
        organizationId: ORG_ID,
        deliveryNumber: dl.deliveryNumber,
        salesOrderId: dl.salesOrderId,
        warehouseId,
        status: dl.status,
        deliveryDate: dl.deliveryDate ? new Date(dl.deliveryDate) : null,
        deliveredById: dl.deliveredById ?? null,
        notes: dl.notes ?? null,
        lines: {
          create: dl.lines.map((line) => ({
            organizationId: ORG_ID,
            productId: skuToId.get(line.sku)!,
            orderedQuantity: line.orderedQuantity,
            deliveredQuantity: line.deliveredQuantity,
            returnedQuantity: line.returnedQuantity ?? 0,
          })),
        },
      },
      include: { lines: true, salesOrder: true, warehouse: true },
    });

    if (dl.status === "DELIVERED") {
      for (const line of delivery.lines) {
        if (line.deliveredQuantity <= 0) continue;

        await prisma.stockMovement.create({
          data: {
            organizationId: ORG_ID,
            productId: line.productId,
            warehouseId,
            type: "ISSUE",
            quantity: line.deliveredQuantity,
            reference: dl.deliveryNumber,
            notes: `Delivery for ${delivery.salesOrder.soNumber}`,
            createdById: dl.deliveredById ?? SALES_USER_ID,
            createdAt: dl.deliveryDate ? new Date(dl.deliveryDate) : undefined,
          },
        });

        const balance = await prisma.stockBalance.findUnique({
          where: {
            productId_warehouseId: { productId: line.productId, warehouseId },
          },
        });

        if (balance) {
          await prisma.stockBalance.update({
            where: { id: balance.id },
            data: { quantityOnHand: { decrement: line.deliveredQuantity } },
          });
        }
      }

      await prisma.notification.create({
        data: {
          organizationId: ORG_ID,
          userId: null,
          type: "SUCCESS",
          module: "SALES",
          title: "Delivery completed",
          message: `${dl.deliveryNumber} delivered for SO (seed data).`,
          entityType: "delivery",
          entityId: dl.id,
          isRead: Math.random() > 0.5,
        },
      });
      notificationsCreated += 1;
    }
  }

  return {
    goodsReceipts: GOODS_RECEIPTS.length,
    deliveries: DELIVERIES.length,
    workflowNotifications: notificationsCreated,
  };
}

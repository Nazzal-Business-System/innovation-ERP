import { PrismaClient } from "@prisma/client";
import { WAREHOUSE_IDS } from "./seed-inventory.js";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const INVENTORY_USER_ID = "00000000-0000-4000-8000-000000000022";

export async function seedInventoryExpansion(prisma: PrismaClient) {
  await prisma.stockReservationLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.stockReservation.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.warehouseTransferLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.warehouseTransfer.deleteMany({ where: { organizationId: ORG_ID } });

  await prisma.stockBalance.updateMany({
    where: { organizationId: ORG_ID },
    data: { quantityReserved: 0 },
  });

  const confirmedOrders = await prisma.salesOrder.findMany({
    where: { organizationId: ORG_ID, status: "CONFIRMED" },
    include: {
      warehouse: true,
      lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { soNumber: "asc" },
  });

  let reservationSeq = 0;
  for (const order of confirmedOrders) {
    reservationSeq += 1;
    const reservationNumber = `SR-2026-${String(reservationSeq).padStart(4, "0")}`;

    await prisma.stockReservation.create({
      data: {
        id: `00000000-0000-4000-8000-000000000${700 + reservationSeq}`,
        organizationId: ORG_ID,
        reservationNumber,
        salesOrderId: order.id,
        warehouseId: order.warehouseId,
        status: "ACTIVE",
        reservedDate: order.orderDate,
        notes: `Demo reservation for ${order.soNumber}`,
        lines: {
          create: order.lines.map((line) => ({
            organizationId: ORG_ID,
            productId: line.productId,
            quantity: line.quantity,
          })),
        },
      },
    });

    for (const line of order.lines) {
      await prisma.stockBalance.upsert({
        where: {
          productId_warehouseId: { productId: line.productId, warehouseId: order.warehouseId },
        },
        create: {
          organizationId: ORG_ID,
          productId: line.productId,
          warehouseId: order.warehouseId,
          quantityOnHand: 0,
          quantityReserved: line.quantity,
        },
        update: { quantityReserved: { increment: line.quantity } },
      });
    }
  }

  const products = await prisma.product.findMany({
    where: { organizationId: ORG_ID },
    take: 3,
    orderBy: { sku: "asc" },
  });

  if (products.length >= 2) {
    await prisma.warehouseTransfer.create({
      data: {
        id: "00000000-0000-4000-8000-000000000720",
        organizationId: ORG_ID,
        transferNumber: "WT-2026-0001",
        sourceWarehouseId: WAREHOUSE_IDS.amman,
        destinationWarehouseId: WAREHOUSE_IDS.irbid,
        status: "IN_TRANSIT",
        transferDate: new Date("2026-06-01"),
        notes: "Replenish Irbid branch — beverages",
        createdById: INVENTORY_USER_ID,
        lines: {
          create: [
            { organizationId: ORG_ID, productId: products[0].id, quantity: 50 },
            { organizationId: ORG_ID, productId: products[1].id, quantity: 30 },
          ],
        },
      },
    });

    await prisma.warehouseTransfer.create({
      data: {
        id: "00000000-0000-4000-8000-000000000721",
        organizationId: ORG_ID,
        transferNumber: "WT-2026-0002",
        sourceWarehouseId: WAREHOUSE_IDS.amman,
        destinationWarehouseId: WAREHOUSE_IDS.irbid,
        status: "DRAFT",
        transferDate: new Date("2026-06-10"),
        notes: "Draft transfer — dry goods",
        createdById: INVENTORY_USER_ID,
        lines: {
          create: [{ organizationId: ORG_ID, productId: products[2]?.id ?? products[0].id, quantity: 20 }],
        },
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        organizationId: ORG_ID,
        userId: null,
        type: "INFO",
        module: "INVENTORY",
        title: "Stock reserved",
        message: "SR-2026-0001 reserved stock for SO-2026-0016 at Amman Distribution Center.",
        entityType: "stock_reservation",
        entityId: "00000000-0000-4000-8000-000000000701",
      },
      {
        organizationId: ORG_ID,
        userId: null,
        type: "INFO",
        module: "INVENTORY",
        title: "Reservation released",
        message: "Demo: reservation release notification for cancelled orders.",
        entityType: "stock_reservation",
        entityId: "00000000-0000-4000-8000-000000000701",
      },
    ],
  });

  const reservationCount = await prisma.stockReservation.count({ where: { organizationId: ORG_ID } });
  const transferCount = await prisma.warehouseTransfer.count({ where: { organizationId: ORG_ID } });

  return { reservations: reservationCount, transfers: transferCount };
}

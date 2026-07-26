import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

type SalesOrderWithLines = Prisma.SalesOrderGetPayload<{
  include: { lines: { include: { product: true } }; warehouse: true; customer: true };
}>;

type DeliveryWithLines = Prisma.DeliveryGetPayload<{
  include: {
    lines: { include: { product: true } };
    salesOrder: true;
    warehouse: true;
  };
}>;

async function getAvailable(
  tx: Prisma.TransactionClient,
  orgId: string,
  productId: string,
  warehouseId: string
): Promise<number> {
  const balance = await tx.stockBalance.findUnique({
    where: { productId_warehouseId: { productId, warehouseId } },
  });
  if (!balance) return 0;
  return balance.quantityOnHand - balance.quantityReserved;
}

export async function createReservationForSalesOrder(
  order: SalesOrderWithLines,
  orgId: string
): Promise<void> {
  const existing = await prisma.stockReservation.findFirst({
    where: {
      organizationId: orgId,
      salesOrderId: order.id,
      status: { in: ["ACTIVE", "CONSUMED"] },
    },
  });
  if (existing) return;

  await prisma.$transaction(async (tx) => {
    for (const line of order.lines) {
      const available = await getAvailable(tx, orgId, line.productId, order.warehouseId);
      if (available < line.quantity) {
        throw new Error(
          `Insufficient available stock for ${line.product.sku}: need ${line.quantity}, available ${available}`
        );
      }
    }

    const count = await tx.stockReservation.count({ where: { organizationId: orgId } });
    const reservationNumber = `SR-2026-${String(count + 1).padStart(4, "0")}`;

    const reservation = await tx.stockReservation.create({
      data: {
        organizationId: orgId,
        reservationNumber,
        salesOrderId: order.id,
        warehouseId: order.warehouseId,
        status: "ACTIVE",
        reservedDate: new Date(),
        notes: `Auto-reserved for ${order.soNumber}`,
        lines: {
          create: order.lines.map((line) => ({
            organizationId: orgId,
            productId: line.productId,
            quantity: line.quantity,
          })),
        },
      },
    });

    for (const line of order.lines) {
      await tx.stockBalance.upsert({
        where: {
          productId_warehouseId: { productId: line.productId, warehouseId: order.warehouseId },
        },
        create: {
          organizationId: orgId,
          productId: line.productId,
          warehouseId: order.warehouseId,
          quantityOnHand: 0,
          quantityReserved: line.quantity,
        },
        update: { quantityReserved: { increment: line.quantity } },
      });
    }

    await tx.notification.create({
      data: {
        organizationId: orgId,
        userId: null,
        type: "INFO",
        module: "INVENTORY",
        title: "Stock reserved",
        message: `${reservationNumber} reserved stock for ${order.soNumber} at ${order.warehouse.name}.`,
        entityType: "stock_reservation",
        entityId: reservation.id,
      },
    });
  });
}

export async function releaseReservationForSalesOrder(salesOrderId: string, orgId: string): Promise<void> {
  const reservation = await prisma.stockReservation.findFirst({
    where: { organizationId: orgId, salesOrderId, status: "ACTIVE" },
    include: { lines: true },
  });
  if (!reservation) return;

  await prisma.$transaction(async (tx) => {
    for (const line of reservation.lines) {
      await tx.stockBalance.update({
        where: {
          productId_warehouseId: {
            productId: line.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { quantityReserved: { decrement: line.quantity } },
      });
    }

    await tx.stockReservation.update({
      where: { id: reservation.id },
      data: { status: "RELEASED", releasedDate: new Date() },
    });

    await tx.notification.create({
      data: {
        organizationId: orgId,
        userId: null,
        type: "INFO",
        module: "INVENTORY",
        title: "Reservation released",
        message: `${reservation.reservationNumber} released — sales order cancelled or reversed.`,
        entityType: "stock_reservation",
        entityId: reservation.id,
      },
    });
  });
}

export async function consumeReservationOnDelivery(
  delivery: DeliveryWithLines,
  orgId: string,
  tx: Prisma.TransactionClient,
  options?: { fullyDelivered?: boolean }
): Promise<void> {
  const reservation = await tx.stockReservation.findFirst({
    where: { organizationId: orgId, salesOrderId: delivery.salesOrderId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!reservation) return;

  const issueLines = delivery.lines.filter((l) => l.deliveredQuantity > 0);
  await Promise.all(
    issueLines.map((line) =>
      tx.stockBalance.update({
        where: {
          productId_warehouseId: {
            productId: line.productId,
            warehouseId: delivery.warehouseId,
          },
        },
        data: { quantityReserved: { decrement: line.deliveredQuantity } },
      })
    )
  );

  let fullyDelivered = options?.fullyDelivered;
  if (fullyDelivered === undefined) {
    const [allDeliveries, so] = await Promise.all([
      tx.delivery.findMany({
        where: {
          organizationId: orgId,
          salesOrderId: delivery.salesOrderId,
          status: "DELIVERED",
        },
        select: {
          lines: { select: { productId: true, deliveredQuantity: true } },
        },
      }),
      tx.salesOrder.findFirstOrThrow({
        where: { id: delivery.salesOrderId },
        select: { lines: { select: { productId: true, quantity: true } } },
      }),
    ]);

    const deliveredByProduct = new Map<string, number>();
    for (const d of allDeliveries) {
      for (const line of d.lines) {
        deliveredByProduct.set(
          line.productId,
          (deliveredByProduct.get(line.productId) ?? 0) + line.deliveredQuantity
        );
      }
    }
    fullyDelivered = so.lines.every(
      (soLine) => (deliveredByProduct.get(soLine.productId) ?? 0) >= soLine.quantity
    );
  }

  if (fullyDelivered) {
    await tx.stockReservation.updateMany({
      where: { id: reservation.id, status: "ACTIVE" },
      data: { status: "CONSUMED", releasedDate: new Date() },
    });
  }
}

export async function checkDeliveryStockAvailable(
  delivery: DeliveryWithLines,
  orgId: string
): Promise<{ ok: boolean; warnings: string[] }> {
  const warnings: string[] = [];
  const activeLines = delivery.lines.filter((l) => l.deliveredQuantity > 0);
  if (activeLines.length === 0) return { ok: true, warnings };

  const balances = await prisma.stockBalance.findMany({
    where: {
      organizationId: orgId,
      warehouseId: delivery.warehouseId,
      productId: { in: activeLines.map((l) => l.productId) },
    },
  });
  const onHandByProduct = new Map(balances.map((b) => [b.productId, b.quantityOnHand]));

  for (const line of activeLines) {
    const qty = line.deliveredQuantity;
    const onHand = onHandByProduct.get(line.productId) ?? 0;
    if (onHand < qty) {
      warnings.push(
        `Insufficient on-hand stock for ${line.product.sku}: need ${qty}, on hand ${onHand}`
      );
    }
  }

  return { ok: warnings.length === 0, warnings };
}

type TransferWithLines = Prisma.WarehouseTransferGetPayload<{
  include: { lines: { include: { product: true } }; sourceWarehouse: true; destinationWarehouse: true };
}>;

export async function completeWarehouseTransfer(
  transfer: TransferWithLines,
  userId: string,
  orgId: string
) {
  if (transfer.status !== "DRAFT" && transfer.status !== "IN_TRANSIT") {
    throw new Error(`Cannot complete transfer with status ${transfer.status}`);
  }

  if (transfer.sourceWarehouseId === transfer.destinationWarehouseId) {
    throw new Error("Source and destination warehouses must differ");
  }

  const hasQty = transfer.lines.some((l) => l.quantity > 0);
  if (!hasQty) {
    throw new Error("At least one line must have quantity greater than zero");
  }

  for (const line of transfer.lines) {
    if (line.quantity <= 0) continue;
    const balance = await prisma.stockBalance.findUnique({
      where: {
        productId_warehouseId: {
          productId: line.productId,
          warehouseId: transfer.sourceWarehouseId,
        },
      },
    });
    const available = (balance?.quantityOnHand ?? 0) - (balance?.quantityReserved ?? 0);
    if (available < line.quantity) {
      throw new Error(
        `Insufficient available stock for ${line.product.sku} at source: need ${line.quantity}, available ${available}`
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const completedDate = new Date();

    await tx.warehouseTransfer.update({
      where: { id: transfer.id },
      data: { status: "COMPLETED", completedDate },
    });

    for (const line of transfer.lines) {
      if (line.quantity <= 0) continue;

      const ref = transfer.transferNumber;

      await tx.stockMovement.create({
        data: {
          organizationId: orgId,
          productId: line.productId,
          warehouseId: transfer.sourceWarehouseId,
          toWarehouseId: transfer.destinationWarehouseId,
          type: "TRANSFER_OUT",
          quantity: line.quantity,
          reference: ref,
          notes: `Transfer to ${transfer.destinationWarehouse.name}`,
          createdById: userId,
        },
      });

      await tx.stockMovement.create({
        data: {
          organizationId: orgId,
          productId: line.productId,
          warehouseId: transfer.destinationWarehouseId,
          toWarehouseId: transfer.sourceWarehouseId,
          type: "TRANSFER_IN",
          quantity: line.quantity,
          reference: ref,
          notes: `Transfer from ${transfer.sourceWarehouse.name}`,
          createdById: userId,
        },
      });

      await tx.stockBalance.update({
        where: {
          productId_warehouseId: {
            productId: line.productId,
            warehouseId: transfer.sourceWarehouseId,
          },
        },
        data: { quantityOnHand: { decrement: line.quantity } },
      });

      await tx.stockBalance.upsert({
        where: {
          productId_warehouseId: {
            productId: line.productId,
            warehouseId: transfer.destinationWarehouseId,
          },
        },
        create: {
          organizationId: orgId,
          productId: line.productId,
          warehouseId: transfer.destinationWarehouseId,
          quantityOnHand: line.quantity,
        },
        update: { quantityOnHand: { increment: line.quantity } },
      });
    }

    await tx.notification.create({
      data: {
        organizationId: orgId,
        userId: null,
        type: "SUCCESS",
        module: "INVENTORY",
        title: "Transfer completed",
        message: `${transfer.transferNumber} moved stock from ${transfer.sourceWarehouse.name} to ${transfer.destinationWarehouse.name}.`,
        entityType: "warehouse_transfer",
        entityId: transfer.id,
      },
    });

    return tx.warehouseTransfer.findFirstOrThrow({
      where: { id: transfer.id },
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        createdBy: true,
        lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
      },
    });
  });
}

export { getAvailable };

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { checkDeliveryStockAvailable } from "./inventory-workflow.js";

type GoodsReceiptWithLines = Prisma.GoodsReceiptGetPayload<{
  include: {
    lines: { include: { product: true } };
    purchaseOrder: { include: { lines: true } };
    warehouse: true;
  };
}>;

type DeliveryWithLines = Prisma.DeliveryGetPayload<{
  include: {
    lines: { include: { product: true } };
    salesOrder: true;
    warehouse: true;
  };
}>;

function sumByProduct(
  lines: Array<{ productId: string; quantity: number }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const line of lines) {
    map.set(line.productId, (map.get(line.productId) ?? 0) + line.quantity);
  }
  return map;
}

function isFullyCovered(
  ordered: Array<{ productId: string; quantity: number }>,
  receivedOrDelivered: Map<string, number>
): boolean {
  for (const line of ordered) {
    if ((receivedOrDelivered.get(line.productId) ?? 0) < line.quantity) {
      return false;
    }
  }
  return true;
}

const goodsReceiptDetailInclude = {
  purchaseOrder: true,
  warehouse: true,
  receivedBy: true,
  lines: { include: { product: true }, orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.GoodsReceiptInclude;

const deliveryDetailInclude = {
  salesOrder: { include: { customer: true } },
  warehouse: true,
  deliveredBy: true,
  lines: { include: { product: true }, orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.DeliveryInclude;

export async function receiveGoodsReceipt(
  receipt: GoodsReceiptWithLines,
  userId: string,
  orgId: string
) {
  if (receipt.status !== "DRAFT") {
    throw new Error(`Cannot receive goods receipt with status ${receipt.status}`);
  }

  const receivableLines = receipt.lines.filter((l) => l.receivedQuantity > 0);
  if (receivableLines.length === 0) {
    throw new Error("At least one line must have a received quantity greater than zero");
  }

  const poId = receipt.purchaseOrderId;
  const poLines = receipt.purchaseOrder.lines;

  // Pre-load prior received qty outside the transaction (avoid remote round-trips inside tx).
  const priorReceipts = await prisma.goodsReceipt.findMany({
    where: {
      organizationId: orgId,
      purchaseOrderId: poId,
      status: "RECEIVED",
      id: { not: receipt.id },
    },
    select: {
      lines: { select: { productId: true, receivedQuantity: true } },
    },
  });

  const receivedByProduct = sumByProduct(
    priorReceipts.flatMap((gr) =>
      gr.lines.map((l) => ({ productId: l.productId, quantity: l.receivedQuantity }))
    )
  );
  for (const line of receivableLines) {
    receivedByProduct.set(
      line.productId,
      (receivedByProduct.get(line.productId) ?? 0) + line.receivedQuantity
    );
  }

  const fullyReceived = isFullyCovered(poLines, receivedByProduct);
  const anyReceived = [...receivedByProduct.values()].some((qty) => qty > 0);
  const receivedDate = new Date();

  // Atomic writes only: status + stock movements + balances + PO status.
  await prisma.$transaction(async (tx) => {
    const updated = await tx.goodsReceipt.updateMany({
      where: { id: receipt.id, organizationId: orgId, status: "DRAFT" },
      data: {
        status: "RECEIVED",
        receivedDate,
        receivedById: userId,
      },
    });
    if (updated.count !== 1) {
      throw new Error("Goods receipt was already received or is no longer in DRAFT");
    }

    await tx.stockMovement.createMany({
      data: receivableLines.map((line) => ({
        organizationId: orgId,
        productId: line.productId,
        warehouseId: receipt.warehouseId,
        type: "RECEIPT" as const,
        quantity: line.receivedQuantity,
        reference: receipt.receiptNumber,
        notes: `Goods receipt from ${receipt.purchaseOrder.poNumber}`,
        createdById: userId,
      })),
    });

    await Promise.all(
      receivableLines.map((line) =>
        tx.stockBalance.upsert({
          where: {
            productId_warehouseId: {
              productId: line.productId,
              warehouseId: receipt.warehouseId,
            },
          },
          create: {
            organizationId: orgId,
            productId: line.productId,
            warehouseId: receipt.warehouseId,
            quantityOnHand: line.receivedQuantity,
          },
          update: {
            quantityOnHand: { increment: line.receivedQuantity },
          },
        })
      )
    );

    if (anyReceived) {
      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED" },
      });
    }
  });

  // Non-critical side effects after commit.
  void prisma.notification
    .create({
      data: {
        organizationId: orgId,
        userId: null,
        type: "SUCCESS",
        module: "PROCUREMENT",
        title: "Goods receipt completed",
        message: `${receipt.receiptNumber} received for ${receipt.purchaseOrder.poNumber} at ${receipt.warehouse.name}.`,
        entityType: "goods_receipt",
        entityId: receipt.id,
      },
    })
    .catch(() => undefined);

  return prisma.goodsReceipt.findFirstOrThrow({
    where: { id: receipt.id },
    include: goodsReceiptDetailInclude,
  });
}

export async function checkDeliveryStock(
  delivery: DeliveryWithLines,
  orgId: string
): Promise<{ ok: boolean; warnings: string[] }> {
  return checkDeliveryStockAvailable(delivery, orgId);
}

export async function deliverDelivery(delivery: DeliveryWithLines, userId: string, orgId: string) {
  if (delivery.status === "DELIVERED" || delivery.status === "CANCELLED") {
    throw new Error(`Cannot deliver with status ${delivery.status}`);
  }

  const issueLines = delivery.lines.filter((l) => l.deliveredQuantity > 0);
  if (issueLines.length === 0) {
    throw new Error("At least one line must have a delivered quantity greater than zero");
  }

  // Validation + expensive reads OUTSIDE the interactive transaction.
  const [stockCheck, so, priorDeliveries, reservation] = await Promise.all([
    checkDeliveryStock(delivery, orgId),
    prisma.salesOrder.findFirstOrThrow({
      where: { id: delivery.salesOrderId, organizationId: orgId },
      include: { lines: true },
    }),
    prisma.delivery.findMany({
      where: {
        organizationId: orgId,
        salesOrderId: delivery.salesOrderId,
        status: "DELIVERED",
        id: { not: delivery.id },
      },
      select: {
        lines: { select: { productId: true, deliveredQuantity: true } },
      },
    }),
    prisma.stockReservation.findFirst({
      where: {
        organizationId: orgId,
        salesOrderId: delivery.salesOrderId,
        status: "ACTIVE",
      },
      select: { id: true },
    }),
  ]);

  if (!stockCheck.ok) {
    throw new Error(stockCheck.warnings.join("; "));
  }

  const deliveredByProduct = sumByProduct(
    priorDeliveries.flatMap((d) =>
      d.lines.map((l) => ({ productId: l.productId, quantity: l.deliveredQuantity }))
    )
  );
  for (const line of issueLines) {
    deliveredByProduct.set(
      line.productId,
      (deliveredByProduct.get(line.productId) ?? 0) + line.deliveredQuantity
    );
  }
  const fullyDelivered = isFullyCovered(so.lines, deliveredByProduct);
  const deliveryDate = new Date();

  /**
   * Transaction timeline (atomic only):
   * 1. claim delivery row (DRAFT/PICKED → DELIVERED)
   * 2. createMany ISSUE movements
   * 3. parallel on-hand decrements
   * 4. parallel reserved decrements (if reservation)
   * 5. optional SO + reservation status updates
   *
   * Outside tx: notification create, response reload.
   */
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.delivery.updateMany({
      where: {
        id: delivery.id,
        organizationId: orgId,
        status: { in: ["DRAFT", "PICKED"] },
      },
      data: {
        status: "DELIVERED",
        deliveryDate,
        deliveredById: userId,
      },
    });
    if (claimed.count !== 1) {
      throw new Error("Delivery was already confirmed or is no longer deliverable");
    }

    await tx.stockMovement.createMany({
      data: issueLines.map((line) => ({
        organizationId: orgId,
        productId: line.productId,
        warehouseId: delivery.warehouseId,
        type: "ISSUE" as const,
        quantity: line.deliveredQuantity,
        reference: delivery.deliveryNumber,
        notes: `Delivery for ${delivery.salesOrder.soNumber}`,
        createdById: userId,
      })),
    });

    await Promise.all(
      issueLines.map((line) =>
        tx.stockBalance.update({
          where: {
            productId_warehouseId: {
              productId: line.productId,
              warehouseId: delivery.warehouseId,
            },
          },
          data: {
            quantityOnHand: { decrement: line.deliveredQuantity },
          },
        })
      )
    );

    if (reservation) {
      await Promise.all(
        issueLines.map((line) =>
          tx.stockBalance.update({
            where: {
              productId_warehouseId: {
                productId: line.productId,
                warehouseId: delivery.warehouseId,
              },
            },
            data: {
              quantityReserved: { decrement: line.deliveredQuantity },
            },
          })
        )
      );

      if (fullyDelivered) {
        await tx.stockReservation.updateMany({
          where: { id: reservation.id, status: "ACTIVE" },
          data: { status: "CONSUMED", releasedDate: new Date() },
        });
      }
    }

    if (fullyDelivered && so.status !== "DELIVERED" && so.status !== "INVOICED") {
      await tx.salesOrder.update({
        where: { id: so.id },
        data: { status: "DELIVERED" },
      });
    }
  });

  void prisma.notification
    .create({
      data: {
        organizationId: orgId,
        userId: null,
        type: "SUCCESS",
        module: "SALES",
        title: "Delivery completed",
        message: `${delivery.deliveryNumber} delivered for ${delivery.salesOrder.soNumber} from ${delivery.warehouse.name}.`,
        entityType: "delivery",
        entityId: delivery.id,
      },
    })
    .catch(() => undefined);

  return prisma.delivery.findFirstOrThrow({
    where: { id: delivery.id },
    include: deliveryDetailInclude,
  });
}

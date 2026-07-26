import { Router } from "express";
import {
  OPERATIONS_PERMISSIONS,
  PROCUREMENT_PERMISSIONS,
  SALES_PERMISSIONS,
} from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  checkDeliveryStock,
  deliverDelivery,
  receiveGoodsReceipt,
} from "../lib/operations-workflow.js";
import { logTransactionError, mapTransactionError } from "../lib/transaction-errors.js";
import {
  createDeliverySchema,
  createGoodsReceiptSchema,
  deliveriesListSchema,
  deliveryIdSchema,
  goodsReceiptIdSchema,
  goodsReceiptsListSchema,
} from "../lib/operations-validation.js";
import {
  serializeDelivery,
  serializeDeliveryDetail,
  serializeGoodsReceipt,
  serializeGoodsReceiptDetail,
} from "../lib/serialize-operations.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

const grSummaryInclude = {
  purchaseOrder: true,
  warehouse: true,
  receivedBy: true,
  _count: { select: { lines: true } },
};

const grDetailInclude = {
  purchaseOrder: true,
  warehouse: true,
  receivedBy: true,
  lines: { include: { product: true }, orderBy: { createdAt: "asc" as const } },
};

const deliverySummaryInclude = {
  salesOrder: { include: { customer: true } },
  warehouse: true,
  deliveredBy: true,
  _count: { select: { lines: true } },
};

const deliveryDetailInclude = {
  salesOrder: { include: { customer: true } },
  warehouse: true,
  deliveredBy: true,
  lines: { include: { product: true }, orderBy: { createdAt: "asc" as const } },
};

router.use(requireJwtConfigured);
router.use(authenticate);

router.get(
  "/overview",
  requirePermission(OPERATIONS_PERMISSIONS.READ, PROCUREMENT_PERMISSIONS.READ, SALES_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [goodsReceipts, deliveries, stockMovements] = await Promise.all([
      prisma.goodsReceipt.findMany({
        where: { organizationId: orgId },
        include: grSummaryInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.delivery.findMany({
        where: { organizationId: orgId },
        include: deliverySummaryInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.stockMovement.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: monthStart },
          type: { in: ["RECEIPT", "ISSUE"] },
        },
      }),
    ]);

    const pendingReceipts = goodsReceipts.filter((r) => r.status === "DRAFT").length;
    const completedReceipts = goodsReceipts.filter((r) => r.status === "RECEIVED").length;
    const pendingDeliveries = deliveries.filter(
      (d) => d.status === "DRAFT" || d.status === "PICKED"
    ).length;
    const completedDeliveries = deliveries.filter((d) => d.status === "DELIVERED").length;

    const workflowAlerts: Array<{
      id: string;
      type: "warning" | "info" | "error";
      title: string;
      message: string;
      href: string | null;
    }> = [];

    for (const receipt of goodsReceipts.filter((r) => r.status === "DRAFT").slice(0, 3)) {
      workflowAlerts.push({
        id: `gr-${receipt.id}`,
        type: "info",
        title: "Pending goods receipt",
        message: `${receipt.receiptNumber} awaiting receive for ${receipt.purchaseOrder.poNumber}`,
        href: `/dashboard/operations/goods-receipts/${receipt.id}`,
      });
    }

    for (const delivery of deliveries.filter((d) => d.status === "DRAFT" || d.status === "PICKED").slice(0, 3)) {
      const stockCheck = await checkDeliveryStock(
        await prisma.delivery.findFirstOrThrow({
          where: { id: delivery.id },
          include: {
            lines: { include: { product: true } },
            salesOrder: true,
            warehouse: true,
          },
        }),
        orgId
      );
      workflowAlerts.push({
        id: `dl-${delivery.id}`,
        type: stockCheck.ok ? "info" : "warning",
        title: stockCheck.ok ? "Pending delivery" : "Delivery blocked — low stock",
        message: stockCheck.ok
          ? `${delivery.deliveryNumber} ready for ${delivery.salesOrder.soNumber}`
          : stockCheck.warnings[0] ?? "Insufficient stock",
        href: `/dashboard/operations/deliveries/${delivery.id}`,
      });
    }

    res.json({
      pendingReceipts,
      completedReceipts,
      pendingDeliveries,
      completedDeliveries,
      stockImpactsThisMonth: stockMovements.length,
      recentGoodsReceipts: goodsReceipts.slice(0, 8).map(serializeGoodsReceipt),
      recentDeliveries: deliveries.slice(0, 8).map(serializeDelivery),
      workflowAlerts,
    });
  })
);

router.get(
  "/goods-receipts",
  requirePermission(OPERATIONS_PERMISSIONS.READ, PROCUREMENT_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = goodsReceiptsListSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { receiptNumber: { contains: search, mode: "insensitive" as const } },
              { notes: { contains: search, mode: "insensitive" as const } },
              { purchaseOrder: { poNumber: { contains: search, mode: "insensitive" as const } } },
              { warehouse: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [receipts, total] = await Promise.all([
      prisma.goodsReceipt.findMany({
        where,
        include: grSummaryInclude,
        orderBy: [{ receivedDate: "desc" }, { receiptNumber: "desc" }],
        skip,
        take: limit,
      }),
      prisma.goodsReceipt.count({ where }),
    ]);

    res.json({
      data: receipts.map(serializeGoodsReceipt),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/goods-receipts/:id",
  requirePermission(OPERATIONS_PERMISSIONS.READ, PROCUREMENT_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = goodsReceiptIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid goods receipt id" });
      return;
    }

    const receipt = await prisma.goodsReceipt.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: grDetailInclude,
    });

    if (!receipt) {
      res.status(404).json({ error: "Goods receipt not found" });
      return;
    }

    res.json(serializeGoodsReceiptDetail(receipt));
  })
);

router.post(
  "/goods-receipts",
  requirePermission(OPERATIONS_PERMISSIONS.WRITE, PROCUREMENT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createGoodsReceiptSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const { purchaseOrderId, notes, lines } = parsed.data;
    let { warehouseId } = parsed.data;

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, organizationId: orgId },
      include: { lines: true },
    });

    if (!po) {
      res.status(400).json({ error: "Purchase order not found" });
      return;
    }

    if (po.status === "CANCELLED" || po.status === "DRAFT" || po.status === "SENT") {
      res.status(400).json({ error: `Cannot create receipt for PO with status ${po.status}` });
      return;
    }

    warehouseId = warehouseId ?? po.warehouseId;

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: warehouseId, organizationId: orgId, isActive: true },
    });

    if (!warehouse) {
      res.status(400).json({ error: "Warehouse not found or inactive" });
      return;
    }

    const poProductIds = new Set(po.lines.map((l) => l.productId));
    for (const line of lines) {
      if (!poProductIds.has(line.productId)) {
        res.status(400).json({ error: "Product not on purchase order" });
        return;
      }
    }

    const productIds = lines.map((l) => l.productId);
    const products = await prisma.product.findMany({
      where: {
        organizationId: orgId,
        id: { in: productIds },
        isArchived: false,
        status: "ACTIVE",
      },
    });
    if (products.length !== new Set(productIds).size) {
      res.status(400).json({ error: "One or more products not found, archived, or inactive" });
      return;
    }

    const count = await prisma.goodsReceipt.count({ where: { organizationId: orgId } });
    const receiptNumber = `GR-2026-${String(count + 1).padStart(4, "0")}`;

    const receipt = await prisma.goodsReceipt.create({
      data: {
        organizationId: orgId,
        receiptNumber,
        purchaseOrderId,
        warehouseId,
        status: "DRAFT",
        notes: notes ?? null,
        lines: {
          create: lines.map((line) => ({
            organizationId: orgId,
            productId: line.productId,
            orderedQuantity: line.orderedQuantity,
            receivedQuantity: line.receivedQuantity,
            rejectedQuantity: line.rejectedQuantity,
            notes: line.notes ?? null,
          })),
        },
      },
      include: grDetailInclude,
    });

    res.status(201).json(serializeGoodsReceiptDetail(receipt));
  })
);

router.patch(
  "/goods-receipts/:id/receive",
  requirePermission(OPERATIONS_PERMISSIONS.WRITE, PROCUREMENT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = goodsReceiptIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid goods receipt id" });
      return;
    }

    const receipt = await prisma.goodsReceipt.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: {
        lines: { include: { product: true } },
        purchaseOrder: { include: { lines: true } },
        warehouse: true,
      },
    });

    if (!receipt) {
      res.status(404).json({ error: "Goods receipt not found" });
      return;
    }

    try {
      const updated = await receiveGoodsReceipt(receipt, userId, orgId);
      res.json(serializeGoodsReceiptDetail(updated));
    } catch (err) {
      logTransactionError("goods-receipt.receive", err);
      const mapped = mapTransactionError(
        err,
        "This goods receipt could not be completed. Review quantities and try again."
      );
      res.status(mapped.status).json({ error: mapped.error });
    }
  })
);

router.get(
  "/deliveries",
  requirePermission(OPERATIONS_PERMISSIONS.READ, SALES_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = deliveriesListSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { deliveryNumber: { contains: search, mode: "insensitive" as const } },
              { notes: { contains: search, mode: "insensitive" as const } },
              { salesOrder: { soNumber: { contains: search, mode: "insensitive" as const } } },
              { salesOrder: { customer: { name: { contains: search, mode: "insensitive" as const } } } },
              { warehouse: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: deliverySummaryInclude,
        orderBy: [{ deliveryDate: "desc" }, { deliveryNumber: "desc" }],
        skip,
        take: limit,
      }),
      prisma.delivery.count({ where }),
    ]);

    res.json({
      data: deliveries.map(serializeDelivery),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/deliveries/:id",
  requirePermission(OPERATIONS_PERMISSIONS.READ, SALES_PERMISSIONS.READ),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = deliveryIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid delivery id" });
      return;
    }

    const delivery = await prisma.delivery.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: deliveryDetailInclude,
    });

    if (!delivery) {
      res.status(404).json({ error: "Delivery not found" });
      return;
    }

    const stockCheck = await checkDeliveryStock(delivery, orgId);

    const balances = await prisma.stockBalance.findMany({
      where: {
        organizationId: orgId,
        warehouseId: delivery.warehouseId,
        productId: { in: delivery.lines.map((l) => l.productId) },
      },
    });
    const availableStock = new Map(balances.map((b) => [b.productId, b.quantityOnHand]));

    res.json(
      serializeDeliveryDetail(delivery, {
        canDeliver:
          (delivery.status === "DRAFT" || delivery.status === "PICKED") && stockCheck.ok,
        stockWarnings: stockCheck.warnings,
        availableStock,
      })
    );
  })
);

router.post(
  "/deliveries",
  requirePermission(OPERATIONS_PERMISSIONS.WRITE, SALES_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createDeliverySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const { salesOrderId, notes, lines, status: deliveryStatus } = parsed.data;
    let { warehouseId } = parsed.data;

    const so = await prisma.salesOrder.findFirst({
      where: { id: salesOrderId, organizationId: orgId },
      include: { lines: true },
    });

    if (!so) {
      res.status(400).json({ error: "Sales order not found" });
      return;
    }

    if (so.status === "CANCELLED" || so.status === "DRAFT") {
      res.status(400).json({ error: `Cannot create delivery for SO with status ${so.status}` });
      return;
    }

    warehouseId = warehouseId ?? so.warehouseId;

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: warehouseId, organizationId: orgId, isActive: true },
    });

    if (!warehouse) {
      res.status(400).json({ error: "Warehouse not found or inactive" });
      return;
    }

    const soProductIds = new Set(so.lines.map((l) => l.productId));
    for (const line of lines) {
      if (!soProductIds.has(line.productId)) {
        res.status(400).json({ error: "Product not on sales order" });
        return;
      }
    }

    const productIds = lines.map((l) => l.productId);
    const products = await prisma.product.findMany({
      where: {
        organizationId: orgId,
        id: { in: productIds },
        isArchived: false,
        status: "ACTIVE",
      },
    });
    if (products.length !== new Set(productIds).size) {
      res.status(400).json({ error: "One or more products not found, archived, or inactive" });
      return;
    }

    const count = await prisma.delivery.count({ where: { organizationId: orgId } });
    const deliveryNumber = `DL-2026-${String(count + 1).padStart(4, "0")}`;

    const delivery = await prisma.delivery.create({
      data: {
        organizationId: orgId,
        deliveryNumber,
        salesOrderId,
        warehouseId,
        status: deliveryStatus ?? "DRAFT",
        notes: notes ?? null,
        lines: {
          create: lines.map((line) => ({
            organizationId: orgId,
            productId: line.productId,
            orderedQuantity: line.orderedQuantity,
            deliveredQuantity: line.deliveredQuantity,
            returnedQuantity: line.returnedQuantity,
            notes: line.notes ?? null,
          })),
        },
      },
      include: deliveryDetailInclude,
    });

    res.status(201).json(serializeDeliveryDetail(delivery));
  })
);

router.patch(
  "/deliveries/:id/deliver",
  requirePermission(OPERATIONS_PERMISSIONS.WRITE, SALES_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = deliveryIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid delivery id" });
      return;
    }

    const delivery = await prisma.delivery.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: {
        lines: { include: { product: true } },
        salesOrder: true,
        warehouse: true,
      },
    });

    if (!delivery) {
      res.status(404).json({ error: "Delivery not found" });
      return;
    }

    try {
      const updated = await deliverDelivery(delivery, userId, orgId);
      res.json(serializeDeliveryDetail(updated));
    } catch (err) {
      logTransactionError("delivery.deliver", err);
      const mapped = mapTransactionError(
        err,
        "This delivery could not be confirmed because the stock changed. Review the available quantities and try again."
      );
      res.status(mapped.status).json({ error: mapped.error });
    }
  })
);

export default router;

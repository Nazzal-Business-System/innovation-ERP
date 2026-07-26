import { Router } from "express";
import { INVENTORY_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  changedFields,
  getMasterDataLifecycle,
  logMasterDataEvent,
} from "../lib/master-data-audit.js";
import { setLifecycleSchema } from "../lib/master-data-validation.js";
import {
  createTransferSchema,
  movementsListSchema,
  productIdSchema,
  productsListSchema,
  reservationIdSchema,
  reservationsListSchema,
  transferIdSchema,
  transfersListSchema,
  updateProductSchema,
  updateWarehouseSchema,
  warehouseIdSchema,
  warehousesListSchema,
} from "../lib/inventory-validation.js";
import {
  formatMoney,
  reservationAvailableMap,
  serializeMovement,
  serializeProduct,
  serializeProductDetail,
  serializeReservation,
  serializeTransfer,
  serializeWarehouse,
} from "../lib/serialize-inventory.js";
import { completeWarehouseTransfer } from "../lib/inventory-workflow.js";
import { logTransactionError, mapTransactionError } from "../lib/transaction-errors.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

const productDetailInclude = {
  stockBalances: { include: { warehouse: true } },
} as const;

const warehouseDetailInclude = {
  stockBalances: { include: { product: true } },
} as const;

const movementInclude = {
  product: true,
  warehouse: true,
  toWarehouse: true,
  createdBy: true,
} as const;

async function loadProductDetail(orgId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId: orgId },
    include: productDetailInclude,
  });
  if (!product) return null;

  const [recentMovements, lifecycle] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { organizationId: orgId, productId: product.id },
      include: movementInclude,
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getMasterDataLifecycle(prisma, {
      organizationId: orgId,
      entity: "Product",
      entityId: product.id,
      metadata: {
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        archivedAt: product.archivedAt,
        restoredAt: product.restoredAt,
      },
    }),
  ]);

  return {
    ...serializeProductDetail(product, recentMovements),
    ...lifecycle,
  };
}

async function loadWarehouseDetail(orgId: string, warehouseId: string) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, organizationId: orgId },
    include: warehouseDetailInclude,
  });
  if (!warehouse) return null;

  const [recentMovements, lifecycle] = await Promise.all([
    prisma.stockMovement.findMany({
      where: {
        organizationId: orgId,
        OR: [{ warehouseId: warehouse.id }, { toWarehouseId: warehouse.id }],
      },
      include: movementInclude,
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    getMasterDataLifecycle(prisma, {
      organizationId: orgId,
      entity: "Warehouse",
      entityId: warehouse.id,
      metadata: {
        createdAt: warehouse.createdAt,
        updatedAt: warehouse.updatedAt,
        deactivatedAt: warehouse.deactivatedAt,
        reactivatedAt: warehouse.reactivatedAt,
      },
    }),
  ]);

  return {
    ...serializeWarehouse(warehouse),
    stock: warehouse.stockBalances.map((b) => ({
      productId: b.productId,
      sku: b.product.sku,
      name: b.product.name,
      category: b.product.category,
      quantityOnHand: b.quantityOnHand,
      quantityReserved: b.quantityReserved,
      available: b.quantityOnHand - b.quantityReserved,
      value: formatMoney(b.quantityOnHand * Number(b.product.costPrice)),
    })),
    recentMovements: recentMovements.map(serializeMovement),
    ...lifecycle,
  };
}

async function warehouseDeactivationBlocks(orgId: string, warehouseId: string) {
  const [
    stockBalances,
    transfers,
    deliveries,
    goodsReceipts,
    salesOrders,
    purchaseOrders,
  ] = await Promise.all([
    prisma.stockBalance.findMany({
      where: {
        organizationId: orgId,
        warehouseId,
        OR: [{ quantityOnHand: { not: 0 } }, { quantityReserved: { not: 0 } }],
      },
      select: { quantityOnHand: true, quantityReserved: true },
    }),
    prisma.warehouseTransfer.count({
      where: {
        organizationId: orgId,
        status: { in: ["DRAFT", "IN_TRANSIT"] },
        OR: [{ sourceWarehouseId: warehouseId }, { destinationWarehouseId: warehouseId }],
      },
    }),
    prisma.delivery.count({
      where: {
        organizationId: orgId,
        warehouseId,
        status: { in: ["DRAFT", "PICKED"] },
      },
    }),
    prisma.goodsReceipt.count({
      where: {
        organizationId: orgId,
        warehouseId,
        status: "DRAFT",
      },
    }),
    prisma.salesOrder.count({
      where: {
        organizationId: orgId,
        warehouseId,
        status: { in: ["DRAFT", "CONFIRMED", "PICKING", "READY_TO_SHIP"] },
      },
    }),
    prisma.purchaseOrder.count({
      where: {
        organizationId: orgId,
        warehouseId,
        status: { in: ["DRAFT", "SENT", "APPROVED", "PARTIALLY_RECEIVED"] },
      },
    }),
  ]);

  const stockWithOnHand = stockBalances.filter((b) => b.quantityOnHand !== 0).length;
  const stockWithReserved = stockBalances.filter((b) => b.quantityReserved !== 0).length;

  return {
    stockWithOnHand,
    stockWithReserved,
    openTransfers: transfers,
    openDeliveries: deliveries,
    draftGoodsReceipts: goodsReceipts,
    openSalesOrders: salesOrders,
    openPurchaseOrders: purchaseOrders,
  };
}

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(INVENTORY_PERMISSIONS.READ));

router.get(
  "/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;

    // One stockBalance graph + lean product/warehouse lists — no duplicated trees.
    const [stockBalances, warehouses, recentMovementCount, transfersInTransit, allProducts] =
      await Promise.all([
        prisma.stockBalance.findMany({
          where: { organizationId: orgId },
          select: {
            warehouseId: true,
            quantityOnHand: true,
            quantityReserved: true,
            productId: true,
            product: { select: { costPrice: true, isArchived: true, status: true } },
          },
        }),
        prisma.warehouse.findMany({
          where: { organizationId: orgId, isActive: true },
          select: { id: true, code: true, name: true, branch: true },
        }),
        prisma.stockMovement.count({
          where: {
            organizationId: orgId,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.warehouseTransfer.count({
          where: { organizationId: orgId, status: "IN_TRANSIT" },
        }),
        prisma.product.findMany({
          where: { organizationId: orgId },
          select: { id: true, status: true, category: true, reorderLevel: true },
        }),
      ]);

    let totalUnitsOnHand = 0;
    let totalUnitsReserved = 0;
    let totalInventoryValue = 0;

    const onHandByProduct = new Map<string, number>();
    const warehouseTotals = new Map<string, { totalUnits: number; totalValue: number }>();

    for (const balance of stockBalances) {
      totalUnitsOnHand += balance.quantityOnHand;
      totalUnitsReserved += balance.quantityReserved;
      const includeInValuation =
        !balance.product.isArchived && balance.product.status === "ACTIVE";
      const lineValue = includeInValuation
        ? balance.quantityOnHand * Number(balance.product.costPrice)
        : 0;
      totalInventoryValue += lineValue;
      onHandByProduct.set(
        balance.productId,
        (onHandByProduct.get(balance.productId) ?? 0) + balance.quantityOnHand
      );

      const wh = warehouseTotals.get(balance.warehouseId) ?? { totalUnits: 0, totalValue: 0 };
      wh.totalUnits += balance.quantityOnHand;
      wh.totalValue += lineValue;
      warehouseTotals.set(balance.warehouseId, wh);
    }

    let lowStockCount = 0;
    let activeProducts = 0;
    const categoryMap = new Map<string, { productCount: number; totalUnits: number }>();
    for (const product of allProducts) {
      if (product.status === "ACTIVE") activeProducts += 1;
      const onHand = onHandByProduct.get(product.id) ?? 0;
      if (product.status === "ACTIVE" && onHand <= product.reorderLevel) {
        lowStockCount += 1;
      }
      const existing = categoryMap.get(product.category) ?? { productCount: 0, totalUnits: 0 };
      categoryMap.set(product.category, {
        productCount: existing.productCount + 1,
        totalUnits: existing.totalUnits + onHand,
      });
    }

    const warehouseSummary = warehouses.map((wh) => {
      const totals = warehouseTotals.get(wh.id) ?? { totalUnits: 0, totalValue: 0 };
      return {
        id: wh.id,
        code: wh.code,
        name: wh.name,
        branch: wh.branch,
        totalUnits: totals.totalUnits,
        totalValue: formatMoney(totals.totalValue),
      };
    });

    res.json({
      totalProducts: allProducts.length,
      activeProducts,
      totalSkus: allProducts.length,
      totalUnitsOnHand,
      totalUnitsReserved,
      totalUnitsAvailable: totalUnitsOnHand - totalUnitsReserved,
      transfersInTransit,
      totalInventoryValue: formatMoney(totalInventoryValue),
      lowStockCount,
      warehouseCount: warehouses.length,
      recentMovementCount,
      topCategories: Array.from(categoryMap.entries())
        .map(([category, stats]) => ({ category, ...stats }))
        .sort((a, b) => b.totalUnits - a.totalUnits)
        .slice(0, 5),
      warehouseSummary,
    });
  })
);

router.get(
  "/products",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = productsListSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, category, status, archived } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(archived !== undefined ? { isArchived: archived } : {}),
      ...(search
        ? {
            OR: [
              { sku: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          description: true,
          category: true,
          unit: true,
          costPrice: true,
          sellPrice: true,
          reorderLevel: true,
          status: true,
          isArchived: true,
          archivedAt: true,
          restoredAt: true,
          createdAt: true,
          updatedAt: true,
          stockBalances: {
            select: { quantityOnHand: true, quantityReserved: true },
          },
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    const serialized = products.map((p) =>
      serializeProduct(p as Parameters<typeof serializeProduct>[0])
    );

    res.json({
      data: serialized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

router.get(
  "/products/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = productIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid product id" });
      return;
    }

    const detail = await loadProductDetail(orgId, parsed.data.id);
    if (!detail) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json(detail);
  })
);

router.patch(
  "/products/:id",
  requirePermission(INVENTORY_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = productIdSchema.safeParse(req.params);
    const bodyParsed = updateProductSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.product.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const body = bodyParsed.data;
    const { profile, notesChanged } = changedFields(body, "description");

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.category !== undefined ? { category: body.category } : {}),
          ...(body.unit !== undefined ? { unit: body.unit } : {}),
          ...(body.costPrice !== undefined ? { costPrice: body.costPrice } : {}),
          ...(body.sellPrice !== undefined ? { sellPrice: body.sellPrice } : {}),
          ...(body.reorderLevel !== undefined ? { reorderLevel: body.reorderLevel } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
        },
      });

      if (profile.length > 0) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Product",
          entityId: existing.id,
          action: "details_updated",
          summary: "Product details updated",
          fields: profile,
        });
      }
      if (notesChanged) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Product",
          entityId: existing.id,
          action: "notes_updated",
          summary: "Product description updated",
          fields: ["description"],
        });
      }
    });

    const detail = await loadProductDetail(orgId, existing.id);
    res.json(detail);
  })
);

router.patch(
  "/products/:id/lifecycle",
  requirePermission(INVENTORY_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = productIdSchema.safeParse(req.params);
    const bodyParsed = setLifecycleSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.product.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const { active } = bodyParsed.data;
    const currentlyActive = !existing.isArchived;
    if (currentlyActive === active) {
      const detail = await loadProductDetail(orgId, existing.id);
      res.json(detail);
      return;
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: active
          ? { isArchived: false, restoredAt: now }
          : { isArchived: true, archivedAt: now },
      });
      await logMasterDataEvent(tx, {
        organizationId: orgId,
        userId,
        entity: "Product",
        entityId: existing.id,
        action: active ? "restored" : "archived",
        summary: active ? "Product restored" : "Product archived",
        description: active
          ? "Product restored; product status was left unchanged"
          : "Product archived; product status was left unchanged",
      });
    });

    const detail = await loadProductDetail(orgId, existing.id);
    res.json(detail);
  })
);

router.get(
  "/warehouses",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = warehousesListSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { active } = parsed.data;

    const warehouses = await prisma.warehouse.findMany({
      where: {
        organizationId: orgId,
        ...(active !== undefined ? { isActive: active } : {}),
      },
      include: {
        stockBalances: { include: { product: true } },
      },
      orderBy: { name: "asc" },
    });

    res.json({ data: warehouses.map(serializeWarehouse) });
  })
);

router.get(
  "/warehouses/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = warehouseIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid warehouse id" });
      return;
    }

    const detail = await loadWarehouseDetail(orgId, parsed.data.id);
    if (!detail) {
      res.status(404).json({ error: "Warehouse not found" });
      return;
    }

    res.json(detail);
  })
);

router.patch(
  "/warehouses/:id",
  requirePermission(INVENTORY_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = warehouseIdSchema.safeParse(req.params);
    const bodyParsed = updateWarehouseSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.warehouse.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Warehouse not found" });
      return;
    }

    const body = bodyParsed.data;
    const { profile, notesChanged } = changedFields(body);

    await prisma.$transaction(async (tx) => {
      await tx.warehouse.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          ...(body.branch !== undefined ? { branch: body.branch } : {}),
          ...(body.address !== undefined ? { address: body.address } : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        },
      });

      if (profile.length > 0) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Warehouse",
          entityId: existing.id,
          action: "details_updated",
          summary: "Warehouse details updated",
          fields: profile,
        });
      }
      if (notesChanged) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Warehouse",
          entityId: existing.id,
          action: "notes_updated",
          summary: "Warehouse notes updated",
          fields: ["notes"],
        });
      }
    });

    const detail = await loadWarehouseDetail(orgId, existing.id);
    res.json(detail);
  })
);

router.patch(
  "/warehouses/:id/lifecycle",
  requirePermission(INVENTORY_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = warehouseIdSchema.safeParse(req.params);
    const bodyParsed = setLifecycleSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.warehouse.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Warehouse not found" });
      return;
    }

    const { active } = bodyParsed.data;
    if (existing.isActive === active) {
      const detail = await loadWarehouseDetail(orgId, existing.id);
      res.json(detail);
      return;
    }

    if (!active) {
      const details = await warehouseDeactivationBlocks(orgId, existing.id);
      const blocked =
        details.stockWithOnHand > 0 ||
        details.stockWithReserved > 0 ||
        details.openTransfers > 0 ||
        details.openDeliveries > 0 ||
        details.draftGoodsReceipts > 0 ||
        details.openSalesOrders > 0 ||
        details.openPurchaseOrders > 0;

      if (blocked) {
        res.status(409).json({
          error: "Warehouse cannot be deactivated while active stock or open documents remain",
          code: "WAREHOUSE_HAS_ACTIVE_DEPENDENCIES",
          details,
        });
        return;
      }
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.warehouse.update({
        where: { id: existing.id },
        data: active
          ? { isActive: true, reactivatedAt: now }
          : { isActive: false, deactivatedAt: now },
      });
      await logMasterDataEvent(tx, {
        organizationId: orgId,
        userId,
        entity: "Warehouse",
        entityId: existing.id,
        action: active ? "reactivated" : "deactivated",
        summary: active ? "Warehouse reactivated" : "Warehouse deactivated",
      });
    });

    const detail = await loadWarehouseDetail(orgId, existing.id);
    res.json(detail);
  })
);

router.get(
  "/movements",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = movementsListSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, type, warehouseId, productId } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(type ? { type } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(productId ? { productId } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: "insensitive" as const } },
              { notes: { contains: search, mode: "insensitive" as const } },
              { product: { sku: { contains: search, mode: "insensitive" as const } } },
              { product: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: true,
          warehouse: true,
          toWarehouse: true,
          createdBy: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({
      data: movements.map(serializeMovement),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

router.get(
  "/reservations",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = reservationsListSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status, warehouseId } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(search
        ? {
            OR: [
              { reservationNumber: { contains: search, mode: "insensitive" as const } },
              { salesOrder: { soNumber: { contains: search, mode: "insensitive" as const } } },
              { warehouse: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [reservations, total] = await Promise.all([
      prisma.stockReservation.findMany({
        where,
        include: {
          salesOrder: true,
          warehouse: true,
          lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: { reservedDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.stockReservation.count({ where }),
    ]);

    const serialized = await Promise.all(
      reservations.map(async (r) => {
        const availableMap = await reservationAvailableMap(r);
        return serializeReservation(r, availableMap);
      })
    );

    res.json({
      data: serialized,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/reservations/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = reservationIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid reservation id" });
      return;
    }

    const reservation = await prisma.stockReservation.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: {
        salesOrder: true,
        warehouse: true,
        lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
      },
    });

    if (!reservation) {
      res.status(404).json({ error: "Reservation not found" });
      return;
    }

    const availableMap = await reservationAvailableMap(reservation);
    res.json(serializeReservation(reservation, availableMap));
  })
);

router.get(
  "/transfers",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = transfersListSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status, sourceWarehouseId, destinationWarehouseId } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(sourceWarehouseId ? { sourceWarehouseId } : {}),
      ...(destinationWarehouseId ? { destinationWarehouseId } : {}),
      ...(search
        ? {
            OR: [
              { transferNumber: { contains: search, mode: "insensitive" as const } },
              { sourceWarehouse: { name: { contains: search, mode: "insensitive" as const } } },
              { destinationWarehouse: { name: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [transfers, total] = await Promise.all([
      prisma.warehouseTransfer.findMany({
        where,
        include: {
          sourceWarehouse: true,
          destinationWarehouse: true,
          createdBy: true,
          lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
        },
        orderBy: { transferDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.warehouseTransfer.count({ where }),
    ]);

    res.json({
      data: transfers.map(serializeTransfer),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/transfers/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = transferIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid transfer id" });
      return;
    }

    const transfer = await prisma.warehouseTransfer.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        createdBy: true,
        lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
      },
    });

    if (!transfer) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }

    res.json(serializeTransfer(transfer));
  })
);

router.post(
  "/transfers",
  requirePermission(INVENTORY_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createTransferSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const { sourceWarehouseId, destinationWarehouseId, transferDate, notes, lines } = parsed.data;

    if (sourceWarehouseId === destinationWarehouseId) {
      res.status(400).json({ error: "Source and destination warehouses must differ" });
      return;
    }

    const productIds = lines.map((l) => l.productId);
    const [sourceWarehouse, destinationWarehouse, products] = await Promise.all([
      prisma.warehouse.findFirst({
        where: { id: sourceWarehouseId, organizationId: orgId, isActive: true },
      }),
      prisma.warehouse.findFirst({
        where: { id: destinationWarehouseId, organizationId: orgId, isActive: true },
      }),
      prisma.product.findMany({
        where: {
          organizationId: orgId,
          id: { in: productIds },
          isArchived: false,
          status: "ACTIVE",
        },
      }),
    ]);

    if (!sourceWarehouse || !destinationWarehouse) {
      res.status(400).json({ error: "Warehouse not found or inactive" });
      return;
    }
    if (products.length !== new Set(productIds).size) {
      res.status(400).json({ error: "One or more products not found, archived, or inactive" });
      return;
    }

    for (const line of lines) {
      const balance = await prisma.stockBalance.findUnique({
        where: {
          productId_warehouseId: { productId: line.productId, warehouseId: sourceWarehouseId },
        },
        include: { product: true },
      });
      const available = (balance?.quantityOnHand ?? 0) - (balance?.quantityReserved ?? 0);
      if (available < line.quantity) {
        res.status(400).json({
          error: `Insufficient available stock for ${balance?.product.sku ?? line.productId}: need ${line.quantity}, available ${available}`,
        });
        return;
      }
    }

    const count = await prisma.warehouseTransfer.count({ where: { organizationId: orgId } });
    const transferNumber = `WT-2026-${String(count + 1).padStart(4, "0")}`;

    const transfer = await prisma.warehouseTransfer.create({
      data: {
        organizationId: orgId,
        transferNumber,
        sourceWarehouseId,
        destinationWarehouseId,
        status: "DRAFT",
        transferDate: transferDate ? new Date(transferDate) : new Date(),
        notes: notes ?? null,
        createdById: req.user!.userId,
        lines: {
          create: lines.map((line) => ({
            organizationId: orgId,
            productId: line.productId,
            quantity: line.quantity,
          })),
        },
      },
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        createdBy: true,
        lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
      },
    });

    res.status(201).json(serializeTransfer(transfer));
  })
);

router.patch(
  "/transfers/:id/complete",
  requirePermission(INVENTORY_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = transferIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid transfer id" });
      return;
    }

    const transfer = await prisma.warehouseTransfer.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        createdBy: true,
        lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
      },
    });

    if (!transfer) {
      res.status(404).json({ error: "Transfer not found" });
      return;
    }

    try {
      const completed = await completeWarehouseTransfer(transfer, req.user!.userId, orgId);
      res.json(serializeTransfer(completed));
    } catch (err) {
      logTransactionError("transfer.complete", err);
      const mapped = mapTransactionError(
        err,
        "This transfer could not be completed. Review stock and warehouses, then try again."
      );
      res.status(mapped.status).json({ error: mapped.error });
    }
  })
);

export default router;

import { Router } from "express";
import { PROCUREMENT_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  changedFields,
  getMasterDataLifecycle,
  logMasterDataEvent,
} from "../lib/master-data-audit.js";
import { setLifecycleSchema } from "../lib/master-data-validation.js";
import {
  createPurchaseOrderSchema,
  createVendorSchema,
  purchaseOrderIdSchema,
  purchaseOrdersListSchema,
  updatePurchaseOrderStatusSchema,
  updateVendorSchema,
  vendorIdSchema,
  vendorsListSchema,
} from "../lib/procurement-validation.js";
import {
  EXPECTED_RECEIPT_STATUSES,
  formatMoney,
  OPEN_PO_STATUSES,
  PENDING_APPROVAL_STATUSES,
  serializePurchaseOrder,
  serializePurchaseOrderDetail,
  serializeVendor,
} from "../lib/serialize-procurement.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { logTransactionError, mapTransactionError } from "../lib/transaction-errors.js";

const router = Router();

const poInclude = {
  vendor: true,
  warehouse: true,
  createdBy: true,
  lines: { include: { product: true }, orderBy: { createdAt: "asc" as const } },
};

const poSummaryInclude = {
  vendor: true,
  warehouse: true,
  createdBy: true,
  _count: { select: { lines: true } },
};

async function loadVendorDetail(orgId: string, vendorId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, organizationId: orgId },
  });
  if (!vendor) return null;

  const [openCount, recentPurchaseOrders, lifecycle] = await Promise.all([
    prisma.purchaseOrder.count({
      where: {
        organizationId: orgId,
        vendorId: vendor.id,
        status: { in: OPEN_PO_STATUSES },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: { organizationId: orgId, vendorId: vendor.id },
      include: poSummaryInclude,
      orderBy: { orderDate: "desc" },
      take: 10,
    }),
    getMasterDataLifecycle(prisma, {
      organizationId: orgId,
      entity: "Vendor",
      entityId: vendor.id,
      metadata: {
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
        archivedAt: vendor.archivedAt,
        restoredAt: vendor.restoredAt,
      },
    }),
  ]);

  return {
    ...serializeVendor(vendor, openCount),
    recentPurchaseOrders: recentPurchaseOrders.map(serializePurchaseOrder),
    ...lifecycle,
  };
}

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(PROCUREMENT_PERMISSIONS.READ));

router.get(
  "/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalVendors,
      activeVendors,
      statusGroups,
      monthlyAgg,
      expectedReceipts,
      expectedReceiptOrders,
      recentPurchaseOrders,
      topSpendGroups,
      vendorDirectory,
      openByVendor,
    ] = await Promise.all([
      prisma.vendor.count({ where: { organizationId: orgId } }),
      prisma.vendor.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.purchaseOrder.groupBy({
        by: ["status"],
        where: { organizationId: orgId },
        _count: { status: true },
      }),
      prisma.purchaseOrder.aggregate({
        where: {
          organizationId: orgId,
          orderDate: { gte: monthStart },
          status: { notIn: ["CANCELLED", "DRAFT"] },
        },
        _sum: { totalAmount: true },
      }),
      prisma.purchaseOrder.count({
        where: {
          organizationId: orgId,
          status: { in: EXPECTED_RECEIPT_STATUSES },
          expectedDate: { gte: now },
        },
      }),
      prisma.purchaseOrder.findMany({
        where: {
          organizationId: orgId,
          status: { in: EXPECTED_RECEIPT_STATUSES },
          expectedDate: { gte: now },
        },
        include: { vendor: { select: { name: true } } },
        orderBy: { expectedDate: "asc" },
        take: 8,
      }),
      prisma.purchaseOrder.findMany({
        where: { organizationId: orgId },
        include: poSummaryInclude,
        orderBy: { orderDate: "desc" },
        take: 8,
      }),
      prisma.purchaseOrder.groupBy({
        by: ["vendorId"],
        where: {
          organizationId: orgId,
          status: { notIn: ["CANCELLED", "DRAFT"] },
        },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: "desc" } },
        take: 5,
      }),
      prisma.vendor.findMany({
        where: { organizationId: orgId },
        select: { id: true, code: true, name: true },
      }),
      prisma.purchaseOrder.groupBy({
        by: ["vendorId"],
        where: {
          organizationId: orgId,
          status: { in: OPEN_PO_STATUSES },
        },
        _count: { vendorId: true },
      }),
    ]);

    const statusCount = new Map(statusGroups.map((g) => [g.status, g._count.status]));
    const openPurchaseOrders = OPEN_PO_STATUSES.reduce(
      (sum, s) => sum + (statusCount.get(s) ?? 0),
      0
    );
    const pendingApprovals = PENDING_APPROVAL_STATUSES.reduce(
      (sum, s) => sum + (statusCount.get(s) ?? 0),
      0
    );

    const vendorById = new Map(vendorDirectory.map((v) => [v.id, v]));
    const openMap = new Map(openByVendor.map((r) => [r.vendorId, r._count.vendorId]));
    const topVendors = topSpendGroups
      .map((g) => {
        const vendor = vendorById.get(g.vendorId);
        if (!vendor) return null;
        return {
          id: vendor.id,
          code: vendor.code,
          name: vendor.name,
          totalSpend: formatMoney(Number(g._sum.totalAmount ?? 0)),
          openOrders: openMap.get(g.vendorId) ?? 0,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v != null);

    const expectedReceiptList = expectedReceiptOrders.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      vendorName: po.vendor.name,
      expectedDate: po.expectedDate!.toISOString().slice(0, 10),
      totalAmount: formatMoney(po.totalAmount),
      status: po.status,
    }));

    res.json({
      totalVendors,
      activeVendors,
      openPurchaseOrders,
      pendingApprovals,
      expectedReceipts,
      monthlyProcurementSpend: formatMoney(Number(monthlyAgg._sum.totalAmount ?? 0)),
      topVendors,
      recentPurchaseOrders: recentPurchaseOrders.map(serializePurchaseOrder),
      purchaseOrdersByStatus: statusGroups.map((g) => ({
        status: g.status,
        count: g._count.status,
      })),
      expectedReceiptList,
    });
  })
);

router.get(
  "/vendors",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = vendorsListSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, active } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(active !== undefined ? { isActive: active } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
              { city: { contains: search, mode: "insensitive" as const } },
              { contactName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [vendors, total, openPoCounts] = await Promise.all([
      prisma.vendor.findMany({
        where,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.vendor.count({ where }),
      prisma.purchaseOrder.groupBy({
        by: ["vendorId"],
        where: {
          organizationId: orgId,
          status: { in: OPEN_PO_STATUSES },
        },
        _count: { vendorId: true },
      }),
    ]);

    const openMap = new Map(openPoCounts.map((r) => [r.vendorId, r._count.vendorId]));

    res.json({
      data: vendors.map((v) => serializeVendor(v, openMap.get(v.id) ?? 0)),
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
  "/vendors/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = vendorIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid vendor id" });
      return;
    }

    const detail = await loadVendorDetail(orgId, parsed.data.id);
    if (!detail) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }

    res.json(detail);
  })
);

router.post(
  "/vendors",
  requirePermission(PROCUREMENT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = createVendorSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const body = parsed.data;
    let code = body.code?.toUpperCase();

    try {
      if (!code) {
        const count = await prisma.vendor.count({ where: { organizationId: orgId } });
        code = `VND-${String(count + 1).padStart(3, "0")}`;
      } else {
        const existingCode = await prisma.vendor.findFirst({
          where: { organizationId: orgId, code },
          select: { id: true },
        });
        if (existingCode) {
          res.status(409).json({ error: "A vendor with this code already exists" });
          return;
        }
      }

      const vendorCode = code;

      const vendor = await prisma.$transaction(async (tx) => {
        const created = await tx.vendor.create({
          data: {
            organizationId: orgId,
            code: vendorCode,
            name: body.name,
            contactName: body.contactName ?? null,
            email: body.email ?? null,
            phone: body.phone ?? null,
            city: body.city,
            paymentTerms: body.paymentTerms,
            notes: body.notes ?? null,
            isActive: true,
          },
        });

        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Vendor",
          entityId: created.id,
          action: "created",
          summary: "Vendor created",
          fields: ["name", "code", "city", "paymentTerms"],
        });

        return created;
      });

      const detail = await loadVendorDetail(orgId, vendor.id);
      res.status(201).json(detail);
    } catch (err) {
      logTransactionError("procurement.createVendor", err);
      const mapped = mapTransactionError(err, "Unable to create vendor");
      const message =
        err instanceof Error && /unique|duplicate/i.test(err.message)
          ? "A vendor with this code already exists"
          : mapped.error;
      res.status(mapped.status === 500 && /unique|duplicate/i.test(String(err)) ? 409 : mapped.status).json({
        error: message,
      });
    }
  })
);

router.patch(
  "/vendors/:id",
  requirePermission(PROCUREMENT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = vendorIdSchema.safeParse(req.params);
    const bodyParsed = updateVendorSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.vendor.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }

    const body = bodyParsed.data;
    const { profile, notesChanged } = changedFields(body);

    await prisma.$transaction(async (tx) => {
      await tx.vendor.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.contactName !== undefined ? { contactName: body.contactName } : {}),
          ...(body.email !== undefined ? { email: body.email } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          ...(body.paymentTerms !== undefined ? { paymentTerms: body.paymentTerms } : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        },
      });

      if (profile.length > 0) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Vendor",
          entityId: existing.id,
          action: "details_updated",
          summary: "Vendor details updated",
          fields: profile,
        });
      }
      if (notesChanged) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Vendor",
          entityId: existing.id,
          action: "notes_updated",
          summary: "Vendor notes updated",
          fields: ["notes"],
        });
      }
    });

    const detail = await loadVendorDetail(orgId, existing.id);
    res.json(detail);
  })
);

router.patch(
  "/vendors/:id/lifecycle",
  requirePermission(PROCUREMENT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = vendorIdSchema.safeParse(req.params);
    const bodyParsed = setLifecycleSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.vendor.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Vendor not found" });
      return;
    }

    const { active } = bodyParsed.data;
    if (existing.isActive === active) {
      const detail = await loadVendorDetail(orgId, existing.id);
      res.json(detail);
      return;
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.vendor.update({
        where: { id: existing.id },
        data: active
          ? { isActive: true, restoredAt: now }
          : { isActive: false, archivedAt: now },
      });
      await logMasterDataEvent(tx, {
        organizationId: orgId,
        userId,
        entity: "Vendor",
        entityId: existing.id,
        action: active ? "restored" : "archived",
        summary: active ? "Vendor restored" : "Vendor archived",
        description: active
          ? "Vendor restored to active status"
          : "Vendor archived; historical purchase orders and records are preserved",
      });
    });

    const detail = await loadVendorDetail(orgId, existing.id);
    res.json(detail);
  })
);

router.get(
  "/purchase-orders",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = purchaseOrdersListSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status, vendorId } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(vendorId ? { vendorId } : {}),
      ...(search
        ? {
            OR: [
              { poNumber: { contains: search, mode: "insensitive" as const } },
              { notes: { contains: search, mode: "insensitive" as const } },
              { vendor: { name: { contains: search, mode: "insensitive" as const } } },
              { vendor: { code: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: poSummaryInclude,
        orderBy: [{ orderDate: "desc" }, { poNumber: "desc" }],
        skip,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({
      data: orders.map(serializePurchaseOrder),
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
  "/purchase-orders/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = purchaseOrderIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid purchase order id" });
      return;
    }

    const order = await prisma.purchaseOrder.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: poInclude,
    });

    if (!order) {
      res.status(404).json({ error: "Purchase order not found" });
      return;
    }

    res.json(serializePurchaseOrderDetail(order));
  })
);

router.post(
  "/purchase-orders",
  requirePermission(PROCUREMENT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createPurchaseOrderSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const { vendorId, warehouseId, expectedDate, notes, lines } = parsed.data;
    const productIds = lines.map((l) => l.productId);

    const [vendor, warehouse, products] = await Promise.all([
      prisma.vendor.findFirst({ where: { id: vendorId, organizationId: orgId, isActive: true } }),
      prisma.warehouse.findFirst({ where: { id: warehouseId, organizationId: orgId, isActive: true } }),
      prisma.product.findMany({
        where: {
          organizationId: orgId,
          id: { in: productIds },
          isArchived: false,
          status: "ACTIVE",
        },
      }),
    ]);

    if (!vendor) {
      res.status(400).json({ error: "Vendor not found or inactive" });
      return;
    }
    if (!warehouse) {
      res.status(400).json({ error: "Warehouse not found or inactive" });
      return;
    }
    if (products.length !== new Set(productIds).size) {
      res.status(400).json({ error: "One or more products not found, archived, or inactive" });
      return;
    }

    const poCount = await prisma.purchaseOrder.count({ where: { organizationId: orgId } });
    const poNumber = `PO-2026-${String(poCount + 1).padStart(4, "0")}`;

    let subtotal = 0;
    const lineData = lines.map((line) => {
      const lineTotal = line.quantity * line.unitCost;
      subtotal += lineTotal;
      return {
        organizationId: orgId,
        productId: line.productId,
        quantity: line.quantity,
        unitCost: line.unitCost,
        lineTotal,
      };
    });

    const taxAmount = Math.round(subtotal * 0.16 * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    const order = await prisma.purchaseOrder.create({
      data: {
        organizationId: orgId,
        vendorId,
        warehouseId,
        poNumber,
        status: "DRAFT",
        orderDate: new Date(),
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        subtotal,
        taxAmount,
        totalAmount,
        notes: notes ?? null,
        createdById: req.user!.userId,
        lines: { create: lineData },
      },
      include: poInclude,
    });

    res.status(201).json(serializePurchaseOrderDetail(order));
  })
);

router.patch(
  "/purchase-orders/:id/status",
  requirePermission(PROCUREMENT_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = purchaseOrderIdSchema.safeParse(req.params);
    const bodyParsed = updatePurchaseOrderStatusSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Purchase order not found" });
      return;
    }

    if (existing.status === "CANCELLED" || existing.status === "RECEIVED") {
      res.status(400).json({ error: `Cannot change status from ${existing.status}` });
      return;
    }

    const order = await prisma.purchaseOrder.update({
      where: { id: existing.id },
      data: { status: bodyParsed.data.status },
      include: poInclude,
    });

    res.json(serializePurchaseOrderDetail(order));
  })
);

export default router;

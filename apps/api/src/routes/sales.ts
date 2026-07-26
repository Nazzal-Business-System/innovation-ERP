import { Router } from "express";
import { SALES_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  changedFields,
  getMasterDataLifecycle,
  logMasterDataEvent,
} from "../lib/master-data-audit.js";
import { setLifecycleSchema } from "../lib/master-data-validation.js";
import {
  createCustomerSchema,
  createSalesOrderSchema,
  customerIdSchema,
  customersListSchema,
  salesOrderIdSchema,
  salesOrdersListSchema,
  updateCustomerSchema,
  updateSalesOrderStatusSchema,
} from "../lib/sales-validation.js";
import {
  formatMoney,
  OPEN_SO_STATUSES,
  PENDING_SHIPMENT_STATUSES,
  serializeCustomer,
  serializeSalesOrder,
  serializeSalesOrderDetail,
} from "../lib/serialize-sales.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";
import {
  createReservationForSalesOrder,
  releaseReservationForSalesOrder,
} from "../lib/inventory-workflow.js";
import { logTransactionError, mapTransactionError } from "../lib/transaction-errors.js";

const router = Router();

const soInclude = {
  customer: true,
  warehouse: true,
  createdBy: true,
  lines: { include: { product: true }, orderBy: { createdAt: "asc" as const } },
};

const soSummaryInclude = {
  customer: true,
  warehouse: true,
  createdBy: true,
  _count: { select: { lines: true } },
};

async function loadCustomerDetail(orgId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
  });
  if (!customer) return null;

  const [openCount, recentSalesOrders, lifecycle] = await Promise.all([
    prisma.salesOrder.count({
      where: {
        organizationId: orgId,
        customerId: customer.id,
        status: { in: OPEN_SO_STATUSES },
      },
    }),
    prisma.salesOrder.findMany({
      where: { organizationId: orgId, customerId: customer.id },
      include: soSummaryInclude,
      orderBy: { orderDate: "desc" },
      take: 10,
    }),
    getMasterDataLifecycle(prisma, {
      organizationId: orgId,
      entity: "Customer",
      entityId: customer.id,
      metadata: {
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        archivedAt: customer.archivedAt,
        restoredAt: customer.restoredAt,
      },
    }),
  ]);

  return {
    ...serializeCustomer(customer, openCount),
    recentSalesOrders: recentSalesOrders.map(serializeSalesOrder),
    ...lifecycle,
  };
}

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(SALES_PERMISSIONS.READ));

router.get(
  "/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCustomers,
      activeCustomers,
      statusGroups,
      monthlyAgg,
      pendingShipmentOrders,
      recentSalesOrders,
      topSpendGroups,
      customerDirectory,
      openByCustomer,
    ] = await Promise.all([
      prisma.customer.count({ where: { organizationId: orgId } }),
      prisma.customer.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.salesOrder.groupBy({
        by: ["status"],
        where: { organizationId: orgId },
        _count: { status: true },
      }),
      prisma.salesOrder.aggregate({
        where: {
          organizationId: orgId,
          orderDate: { gte: monthStart },
          status: { notIn: ["CANCELLED", "DRAFT"] },
        },
        _sum: { totalAmount: true },
        _count: true,
        _avg: { totalAmount: true },
      }),
      prisma.salesOrder.findMany({
        where: {
          organizationId: orgId,
          status: { in: PENDING_SHIPMENT_STATUSES },
          expectedDeliveryDate: { gte: now },
        },
        include: { customer: { select: { name: true } } },
        orderBy: { expectedDeliveryDate: "asc" },
        take: 8,
      }),
      prisma.salesOrder.findMany({
        where: { organizationId: orgId },
        include: soSummaryInclude,
        orderBy: { orderDate: "desc" },
        take: 8,
      }),
      prisma.salesOrder.groupBy({
        by: ["customerId"],
        where: {
          organizationId: orgId,
          status: { notIn: ["CANCELLED", "DRAFT"] },
        },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: "desc" } },
        take: 5,
      }),
      prisma.customer.findMany({
        where: { organizationId: orgId },
        select: { id: true, code: true, name: true },
      }),
      prisma.salesOrder.groupBy({
        by: ["customerId"],
        where: {
          organizationId: orgId,
          status: { in: OPEN_SO_STATUSES },
        },
        _count: { customerId: true },
      }),
    ]);

    const statusCount = new Map(statusGroups.map((g) => [g.status, g._count.status]));
    const openSalesOrders = OPEN_SO_STATUSES.reduce((sum, s) => sum + (statusCount.get(s) ?? 0), 0);
    const pendingShipments = PENDING_SHIPMENT_STATUSES.reduce(
      (sum, s) => sum + (statusCount.get(s) ?? 0),
      0
    );

    const monthlySales = Number(monthlyAgg._sum.totalAmount ?? 0);
    const averageOrderValue = Number(monthlyAgg._avg.totalAmount ?? 0);

    const customerById = new Map(customerDirectory.map((c) => [c.id, c]));
    const openMap = new Map(openByCustomer.map((r) => [r.customerId, r._count.customerId]));
    const topCustomers = topSpendGroups
      .map((g) => {
        const customer = customerById.get(g.customerId);
        if (!customer) return null;
        return {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          totalSales: formatMoney(Number(g._sum.totalAmount ?? 0)),
          openOrders: openMap.get(g.customerId) ?? 0,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c != null);

    res.json({
      totalCustomers,
      activeCustomers,
      openSalesOrders,
      pendingShipments,
      monthlySales: formatMoney(monthlySales),
      averageOrderValue: formatMoney(averageOrderValue),
      topCustomers,
      recentSalesOrders: recentSalesOrders.map(serializeSalesOrder),
      salesOrdersByStatus: statusGroups.map((g) => ({
        status: g.status,
        count: g._count.status,
      })),
      pendingShipmentList: pendingShipmentOrders.map((so) => ({
        id: so.id,
        soNumber: so.soNumber,
        customerName: so.customer.name,
        expectedDeliveryDate: so.expectedDeliveryDate!.toISOString().slice(0, 10),
        totalAmount: formatMoney(so.totalAmount),
        status: so.status,
      })),
    });
  })
);

router.get(
  "/customers",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = customersListSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, customerType, active, sort } = parsed.data;
    const skip = (page - 1) * limit;
    const orderBy =
      sort === "OLDEST"
        ? [{ createdAt: "asc" as const }, { id: "asc" as const }]
        : sort === "NAME_ASC"
          ? [{ name: "asc" as const }, { id: "asc" as const }]
          : sort === "NAME_DESC"
            ? [{ name: "desc" as const }, { id: "desc" as const }]
            : sort === "CODE_ASC"
              ? [{ code: "asc" as const }, { id: "asc" as const }]
              : sort === "CODE_DESC"
                ? [{ code: "desc" as const }, { id: "desc" as const }]
                : sort === "CREDIT_DESC"
                  ? [{ creditLimit: "desc" as const }, { id: "desc" as const }]
                  : sort === "CREDIT_ASC"
                    ? [{ creditLimit: "asc" as const }, { id: "asc" as const }]
                    : [{ createdAt: "desc" as const }, { id: "desc" as const }];

    const where = {
      organizationId: orgId,
      ...(customerType ? { customerType } : {}),
      ...(active !== undefined ? { isActive: active } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
              { city: { contains: search, mode: "insensitive" as const } },
              { contactName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [customers, total, openSoCounts] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
      prisma.salesOrder.groupBy({
        by: ["customerId"],
        where: {
          organizationId: orgId,
          status: { in: OPEN_SO_STATUSES },
        },
        _count: { customerId: true },
      }),
    ]);

    const openMap = new Map(openSoCounts.map((r) => [r.customerId, r._count.customerId]));

    res.json({
      data: customers.map((c) => serializeCustomer(c, openMap.get(c.id) ?? 0)),
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
  "/customers/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = customerIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid customer id" });
      return;
    }

    const detail = await loadCustomerDetail(orgId, parsed.data.id);
    if (!detail) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    res.json(detail);
  })
);

router.post(
  "/customers",
  requirePermission(SALES_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = createCustomerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const body = parsed.data;
    let code = body.code?.toUpperCase();

    try {
      if (!code) {
        const count = await prisma.customer.count({ where: { organizationId: orgId } });
        code = `CUS-${String(count + 1).padStart(3, "0")}`;
      } else {
        const existingCode = await prisma.customer.findFirst({
          where: { organizationId: orgId, code },
          select: { id: true },
        });
        if (existingCode) {
          res.status(409).json({ error: "A customer with this code already exists" });
          return;
        }
      }

      const customerCode = code;

      const customer = await prisma.$transaction(async (tx) => {
        const created = await tx.customer.create({
          data: {
            organizationId: orgId,
            code: customerCode,
            name: body.name,
            contactName: body.contactName ?? null,
            email: body.email ?? null,
            phone: body.phone ?? null,
            city: body.city,
            customerType: body.customerType,
            paymentTerms: body.paymentTerms,
            creditLimit: body.creditLimit,
            notes: body.notes ?? null,
            isActive: true,
          },
        });

        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Customer",
          entityId: created.id,
          action: "created",
          summary: "Customer created",
          fields: ["name", "code", "customerType", "city", "paymentTerms", "creditLimit"],
        });

        return created;
      });

      const detail = await loadCustomerDetail(orgId, customer.id);
      res.status(201).json(detail);
    } catch (err) {
      logTransactionError("sales.createCustomer", err);
      const mapped = mapTransactionError(err, "Unable to create customer");
      const message =
        err instanceof Error && /unique|duplicate/i.test(err.message)
          ? "A customer with this code already exists"
          : mapped.error;
      res.status(mapped.status === 500 && /unique|duplicate/i.test(String(err)) ? 409 : mapped.status).json({
        error: message,
      });
    }
  })
);

router.patch(
  "/customers/:id",
  requirePermission(SALES_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = customerIdSchema.safeParse(req.params);
    const bodyParsed = updateCustomerSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.customer.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const body = bodyParsed.data;
    const { profile, notesChanged } = changedFields(body);

    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: existing.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.contactName !== undefined ? { contactName: body.contactName } : {}),
          ...(body.email !== undefined ? { email: body.email } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          ...(body.customerType !== undefined ? { customerType: body.customerType } : {}),
          ...(body.paymentTerms !== undefined ? { paymentTerms: body.paymentTerms } : {}),
          ...(body.creditLimit !== undefined ? { creditLimit: body.creditLimit } : {}),
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
        },
      });

      if (profile.length > 0) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Customer",
          entityId: existing.id,
          action: "details_updated",
          summary: "Customer details updated",
          fields: profile,
        });
      }
      if (notesChanged) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: "Customer",
          entityId: existing.id,
          action: "notes_updated",
          summary: "Customer notes updated",
          fields: ["notes"],
        });
      }
    });

    const detail = await loadCustomerDetail(orgId, existing.id);
    res.json(detail);
  })
);

router.patch(
  "/customers/:id/lifecycle",
  requirePermission(SALES_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const paramsParsed = customerIdSchema.safeParse(req.params);
    const bodyParsed = setLifecycleSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.customer.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const { active } = bodyParsed.data;
    if (existing.isActive === active) {
      const detail = await loadCustomerDetail(orgId, existing.id);
      res.json(detail);
      return;
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: existing.id },
        data: active
          ? { isActive: true, restoredAt: now }
          : { isActive: false, archivedAt: now },
      });
      await logMasterDataEvent(tx, {
        organizationId: orgId,
        userId,
        entity: "Customer",
        entityId: existing.id,
        action: active ? "restored" : "archived",
        summary: active ? "Customer restored" : "Customer archived",
        description: active
          ? "Customer restored to active status"
          : "Customer archived; historical sales orders and records are preserved",
      });
    });

    const detail = await loadCustomerDetail(orgId, existing.id);
    res.json(detail);
  })
);

router.get(
  "/orders",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = salesOrdersListSchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
      return;
    }

    const { page, limit, search, status, customerId } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { soNumber: { contains: search, mode: "insensitive" as const } },
              { notes: { contains: search, mode: "insensitive" as const } },
              { customer: { name: { contains: search, mode: "insensitive" as const } } },
              { customer: { code: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: soSummaryInclude,
        orderBy: [{ orderDate: "desc" }, { soNumber: "desc" }],
        skip,
        take: limit,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    res.json({
      data: orders.map(serializeSalesOrder),
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
  "/orders/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = salesOrderIdSchema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid sales order id" });
      return;
    }

    const order = await prisma.salesOrder.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: soInclude,
    });

    if (!order) {
      res.status(404).json({ error: "Sales order not found" });
      return;
    }

    res.json(serializeSalesOrderDetail(order));
  })
);

router.post(
  "/orders",
  requirePermission(SALES_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createSalesOrderSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const { customerId, warehouseId, expectedDeliveryDate, notes, lines } = parsed.data;
    const productIds = lines.map((l) => l.productId);

    const [customer, warehouse, products] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, organizationId: orgId, isActive: true },
      }),
      prisma.warehouse.findFirst({
        where: { id: warehouseId, organizationId: orgId, isActive: true },
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

    if (!customer) {
      res.status(400).json({ error: "Customer not found or inactive" });
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

    const soCount = await prisma.salesOrder.count({ where: { organizationId: orgId } });
    const soNumber = `SO-2026-${String(soCount + 1).padStart(4, "0")}`;

    let subtotal = 0;
    const lineData = lines.map((line) => {
      const lineTotal = line.quantity * line.unitPrice;
      subtotal += lineTotal;
      return {
        organizationId: orgId,
        productId: line.productId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal,
      };
    });

    const taxAmount = Math.round(subtotal * 0.16 * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    const order = await prisma.salesOrder.create({
      data: {
        organizationId: orgId,
        customerId,
        warehouseId,
        soNumber,
        status: "DRAFT",
        orderDate: new Date(),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        subtotal,
        taxAmount,
        totalAmount,
        notes: notes ?? null,
        createdById: req.user!.userId,
        lines: { create: lineData },
      },
      include: soInclude,
    });

    res.status(201).json(serializeSalesOrderDetail(order));
  })
);

router.patch(
  "/orders/:id/status",
  requirePermission(SALES_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = salesOrderIdSchema.safeParse(req.params);
    const bodyParsed = updateSalesOrderStatusSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const existing = await prisma.salesOrder.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Sales order not found" });
      return;
    }

    if (existing.status === "CANCELLED" || existing.status === "INVOICED") {
      res.status(400).json({ error: `Cannot change status from ${existing.status}` });
      return;
    }

    const newStatus = bodyParsed.data.status;

    if (newStatus === "CONFIRMED" && existing.status !== "CONFIRMED") {
      const orderForReservation = await prisma.salesOrder.findFirstOrThrow({
        where: { id: existing.id },
        include: {
          customer: true,
          warehouse: true,
          lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
        },
      });
      try {
        await createReservationForSalesOrder(orderForReservation, orgId);
      } catch (err) {
        logTransactionError("sales-order.confirm", err);
        const mapped = mapTransactionError(
          err,
          "This sales order could not be confirmed. Review available stock and try again."
        );
        res.status(mapped.status).json({ error: mapped.error });
        return;
      }
    }

    if (newStatus === "CANCELLED") {
      await releaseReservationForSalesOrder(existing.id, orgId);
    }

    const order = await prisma.salesOrder.update({
      where: { id: existing.id },
      data: { status: newStatus },
      include: soInclude,
    });

    res.json(serializeSalesOrderDetail(order));
  })
);

export default router;

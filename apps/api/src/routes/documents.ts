import { Router } from "express";
import { DOCUMENTS_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import { logMasterDataEvent } from "../lib/master-data-audit.js";
import {
  categoriesListSchema,
  categoryIdSchema,
  createCategorySchema,
  createFileSchema,
  createLinkSchema,
  fileIdSchema,
  filesListSchema,
  linkIdSchema,
  linksListSchema,
  updateCategorySchema,
  updateFileSchema,
} from "../lib/documents-validation.js";
import { toApiDateUtcNoon } from "../lib/api-date.js";
import {
  serializeCategory,
  serializeFile,
  serializeFileDetail,
  serializeLink,
} from "../lib/serialize-documents.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

const fileInclude = {
  category: true,
  uploadedBy: true,
  links: { orderBy: { createdAt: "asc" as const } },
  _count: { select: { links: true } },
} as const;

const categoryInclude = {
  _count: { select: { files: true } },
} as const;

/** Master-data document link targets (module + entityType → canonical audit entity). */
const MASTER_LINK_MAP: Record<string, "Customer" | "Vendor" | "Product" | "Warehouse" | "Employee" | "Account"> = {
  "SALES/customer": "Customer",
  "PROCUREMENT/vendor": "Vendor",
  "OPERATIONS/product": "Product",
  "OPERATIONS/warehouse": "Warehouse",
  "HR/employee": "Employee",
  "ACCOUNTING/account": "Account",
};

function resolveMasterEntity(module: string, entityType: string) {
  return MASTER_LINK_MAP[`${module}/${entityType.toLowerCase()}`] ?? null;
}

async function assertMasterTargetExists(
  organizationId: string,
  entity: NonNullable<ReturnType<typeof resolveMasterEntity>>,
  entityId: string
) {
  switch (entity) {
    case "Customer":
      return prisma.customer.findFirst({ where: { id: entityId, organizationId } });
    case "Vendor":
      return prisma.vendor.findFirst({ where: { id: entityId, organizationId } });
    case "Product":
      return prisma.product.findFirst({ where: { id: entityId, organizationId } });
    case "Warehouse":
      return prisma.warehouse.findFirst({ where: { id: entityId, organizationId } });
    case "Employee":
      return prisma.employee.findFirst({ where: { id: entityId, organizationId } });
    case "Account":
      return prisma.account.findFirst({ where: { id: entityId, organizationId } });
  }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysFromNow(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

async function createDocumentNotification(
  orgId: string,
  userId: string | undefined,
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR",
  title: string,
  message: string,
  entityId: string
) {
  await prisma.notification.create({
    data: {
      organizationId: orgId,
      userId: userId ?? null,
      type,
      module: "DOCUMENTS",
      title,
      message,
      entityType: "document_file",
      entityId,
      isRead: false,
    },
  });
}

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(DOCUMENTS_PERMISSIONS.READ));

router.get(
  "/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const today = startOfDay(new Date());
    const in30 = daysFromNow(30, today);

    const files = await prisma.documentFile.findMany({
      where: { organizationId: orgId },
      include: fileInclude,
      orderBy: { uploadedAt: "desc" },
    });

    const activeDocuments = files.filter((f) => f.status === "ACTIVE").length;
    const expiredDocuments = files.filter((f) => f.status === "EXPIRED").length;
    const pendingReview = files.filter((f) => f.status === "PENDING_REVIEW").length;

    const moduleMap = new Map<string, number>();
    const categoryMap = new Map<string, { name: string; count: number }>();

    for (const file of files) {
      for (const link of file.links) {
        moduleMap.set(link.module, (moduleMap.get(link.module) ?? 0) + 1);
      }
      if (file.categoryId && file.category) {
        const existing = categoryMap.get(file.categoryId) ?? {
          name: file.category.name,
          count: 0,
        };
        categoryMap.set(file.categoryId, { ...existing, count: existing.count + 1 });
      }
    }

    const expiringSoon = files.filter(
      (f) =>
        f.expiryDate &&
        f.expiryDate >= today &&
        f.expiryDate <= in30 &&
        f.status !== "ARCHIVED" &&
        f.status !== "EXPIRED"
    );

    res.json({
      totalDocuments: files.length,
      activeDocuments,
      expiredDocuments,
      pendingReview,
      documentsByModule: Array.from(moduleMap.entries()).map(([module, count]) => ({
        module,
        count,
      })),
      documentsByCategory: Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        count: data.count,
      })),
      expiringSoon: expiringSoon.slice(0, 10).map((f) => serializeFile(f)),
      recentUploads: files.slice(0, 8).map((f) => serializeFile(f)),
    });
  })
);

router.get(
  "/categories",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = categoriesListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters" });
      return;
    }

    const { page, limit, search, activeOnly } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(activeOnly === true ? { isActive: true } : activeOnly === false ? { isActive: false } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [categories, total] = await Promise.all([
      prisma.documentCategory.findMany({
        where,
        include: categoryInclude,
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.documentCategory.count({ where }),
    ]);

    res.json({
      data: categories.map(serializeCategory),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.post(
  "/categories",
  requirePermission(DOCUMENTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const count = await prisma.documentCategory.count({ where: { organizationId: orgId } });
    const code = (parsed.data.code ?? `DCAT-${String(count + 1).padStart(3, "0")}`).toUpperCase();

    const existingCode = await prisma.documentCategory.findFirst({
      where: { organizationId: orgId, code },
      select: { id: true },
    });
    if (existingCode) {
      res.status(409).json({ error: "A category with this code already exists" });
      return;
    }

    const category = await prisma.documentCategory.create({
      data: {
        organizationId: orgId,
        code,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        isActive: parsed.data.isActive ?? true,
      },
      include: categoryInclude,
    });

    res.status(201).json(serializeCategory(category));
  })
);

router.get(
  "/categories/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = categoryIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid category id" });
      return;
    }

    const category = await prisma.documentCategory.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: categoryInclude,
    });

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json(serializeCategory(category));
  })
);

router.patch(
  "/categories/:id",
  requirePermission(DOCUMENTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = categoryIdSchema.safeParse(req.params);
    const bodyParsed = updateCategorySchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.documentCategory.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const body = bodyParsed.data;
    const category = await prisma.documentCategory.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      include: categoryInclude,
    });

    res.json(serializeCategory(category));
  })
);

router.delete(
  "/categories/:id",
  requirePermission(DOCUMENTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = categoryIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid category id" });
      return;
    }

    const existing = await prisma.documentCategory.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: categoryInclude,
    });
    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const documentCount = existing._count.files;
    if (documentCount > 0) {
      res.status(409).json({
        error: "Cannot delete a category that still has documents. Archive it instead.",
        code: "DOCUMENT_CATEGORY_NOT_EMPTY",
        details: { documentCount },
      });
      return;
    }

    await prisma.documentCategory.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

router.get(
  "/files",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = filesListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters" });
      return;
    }

    const { page, limit, search, status, categoryId, module, entityType, entityId } = parsed.data;
    const skip = (page - 1) * limit;

    const linkFilter =
      module || entityType || entityId
        ? {
            links: {
              some: {
                ...(module ? { module } : {}),
                ...(entityType ? { entityType } : {}),
                ...(entityId ? { entityId } : {}),
              },
            },
          }
        : {};

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...linkFilter,
      ...(search
        ? {
            OR: [
              { fileNumber: { contains: search, mode: "insensitive" as const } },
              { title: { contains: search, mode: "insensitive" as const } },
              { fileName: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [files, total] = await Promise.all([
      prisma.documentFile.findMany({
        where,
        include: fileInclude,
        orderBy: { uploadedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.documentFile.count({ where }),
    ]);

    res.json({
      data: files.map((f) => serializeFile(f)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.get(
  "/files/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = fileIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document id" });
      return;
    }

    const file = await prisma.documentFile.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: fileInclude,
    });

    if (!file) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    res.json(serializeFileDetail(file));
  })
);

router.post(
  "/files",
  requirePermission(DOCUMENTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = createFileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const count = await prisma.documentFile.count({ where: { organizationId: orgId } });
    const fileNumber = `DOC-2026-${String(count + 1).padStart(4, "0")}`;
    const status = parsed.data.status ?? "ACTIVE";
    const expiryDate = parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null;
    const initialMasterEntity = parsed.data.link
      ? resolveMasterEntity(parsed.data.link.module, parsed.data.link.entityType)
      : null;

    if (parsed.data.link && initialMasterEntity) {
      const target = await assertMasterTargetExists(
        orgId,
        initialMasterEntity,
        parsed.data.link.entityId
      );
      if (!target) {
        res.status(400).json({ error: `${initialMasterEntity} not found in this organization` });
        return;
      }
    }

    const file = await prisma.$transaction(async (tx) => {
      const created = await tx.documentFile.create({
        data: {
          organizationId: orgId,
          categoryId: parsed.data.categoryId ?? null,
          fileNumber,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          fileName: parsed.data.fileName,
          fileUrl: `/storage/placeholder/${fileNumber}/${parsed.data.fileName}`,
          mimeType: parsed.data.mimeType,
          fileSize: parsed.data.fileSize,
          status,
          expiryDate,
          uploadedById: userId,
        },
        include: fileInclude,
      });

      if (parsed.data.link) {
        await tx.documentLink.create({
          data: {
            organizationId: orgId,
            documentFileId: created.id,
            module: parsed.data.link.module,
            entityType: parsed.data.link.entityType,
            entityId: parsed.data.link.entityId,
          },
        });
        if (initialMasterEntity) {
          await logMasterDataEvent(tx, {
            organizationId: orgId,
            userId,
            entity: initialMasterEntity,
            entityId: parsed.data.link.entityId,
            action: "document_attached",
            summary: `Document attached: ${created.title}`,
            description: `${created.title} (${created.fileNumber}) linked to ${initialMasterEntity}`,
          });
        }
      }

      return tx.documentFile.findFirstOrThrow({
        where: { id: created.id },
        include: fileInclude,
      });
    });

    await createDocumentNotification(
      orgId,
      userId,
      "SUCCESS",
      "Document uploaded",
      `${file.title} (${file.fileNumber}) was uploaded.`,
      file.id
    );

    if (status === "PENDING_REVIEW") {
      await createDocumentNotification(
        orgId,
        userId,
        "INFO",
        "Document pending review",
        `${file.title} requires review before activation.`,
        file.id
      );
    }

    const today = startOfDay(new Date());
    const in30 = daysFromNow(30, today);
    if (expiryDate && expiryDate >= today && expiryDate <= in30) {
      await createDocumentNotification(
        orgId,
        userId,
        "WARNING",
        "Document expiring soon",
        `${file.title} expires on ${expiryDate.toISOString().slice(0, 10)}.`,
        file.id
      );
    }

    res.status(201).json(serializeFileDetail(file));
  })
);

router.patch(
  "/files/:id",
  requirePermission(DOCUMENTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = fileIdSchema.safeParse(req.params);
    const bodyParsed = updateFileSchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.documentFile.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const body = bodyParsed.data;
    if (body.categoryId) {
      const category = await prisma.documentCategory.findFirst({
        where: { id: body.categoryId, organizationId: orgId },
        select: { id: true },
      });
      if (!category) {
        res.status(400).json({
          error: "Category not found in this organization",
          code: "INVALID_CATEGORY",
        });
        return;
      }
    }

    const file = await prisma.documentFile.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.expiryDate !== undefined
          ? { expiryDate: body.expiryDate ? toApiDateUtcNoon(body.expiryDate) : null }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
      include: fileInclude,
    });

    res.json(serializeFileDetail(file));
  })
);

router.patch(
  "/files/:id/archive",
  requirePermission(DOCUMENTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = fileIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document id" });
      return;
    }

    const existing = await prisma.documentFile.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const file = await prisma.documentFile.update({
      where: { id: parsed.data.id },
      data: { status: "ARCHIVED" },
      include: fileInclude,
    });

    await createDocumentNotification(
      orgId,
      userId,
      "INFO",
      "Document archived",
      `${file.title} (${file.fileNumber}) was archived.`,
      file.id
    );

    res.json(serializeFileDetail(file));
  })
);

router.patch(
  "/files/:id/restore",
  requirePermission(DOCUMENTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = fileIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document id" });
      return;
    }

    const existing = await prisma.documentFile.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
    });

    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    if (existing.status !== "ARCHIVED") {
      res.status(400).json({ error: "Document is not archived" });
      return;
    }

    const file = await prisma.documentFile.update({
      where: { id: parsed.data.id },
      data: { status: "ACTIVE" },
      include: fileInclude,
    });

    await createDocumentNotification(
      orgId,
      userId,
      "INFO",
      "Document restored",
      `${file.title} (${file.fileNumber}) was restored.`,
      file.id
    );

    res.json(serializeFileDetail(file));
  })
);

router.get(
  "/links",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = linksListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query parameters" });
      return;
    }

    const { page, limit, module, entityType, entityId, documentFileId } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      organizationId: orgId,
      ...(module ? { module } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(documentFileId ? { documentFileId } : {}),
    };

    const [links, total] = await Promise.all([
      prisma.documentLink.findMany({
        where,
        include: { documentFile: { include: { category: true, uploadedBy: true, links: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.documentLink.count({ where }),
    ]);

    res.json({
      data: links.map((link) => ({
        ...serializeLink(link),
        document: serializeFile({
          ...link.documentFile,
          links: link.documentFile.links,
        }),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

router.post(
  "/links",
  requirePermission(DOCUMENTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = createLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const file = await prisma.documentFile.findFirst({
      where: { id: parsed.data.documentFileId, organizationId: orgId },
    });

    if (!file) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const masterEntity = resolveMasterEntity(parsed.data.module, parsed.data.entityType);
    if (masterEntity) {
      const target = await assertMasterTargetExists(orgId, masterEntity, parsed.data.entityId);
      if (!target) {
        res.status(400).json({ error: `${masterEntity} not found in this organization` });
        return;
      }
    }

    const duplicate = await prisma.documentLink.findFirst({
      where: {
        organizationId: orgId,
        documentFileId: parsed.data.documentFileId,
        module: parsed.data.module,
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
      },
    });
    if (duplicate) {
      res.status(409).json({ error: "Document is already linked to this entity" });
      return;
    }

    const link = await prisma.$transaction(async (tx) => {
      const created = await tx.documentLink.create({
        data: {
          organizationId: orgId,
          documentFileId: parsed.data.documentFileId,
          module: parsed.data.module,
          entityType: parsed.data.entityType,
          entityId: parsed.data.entityId,
        },
      });

      if (masterEntity) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: masterEntity,
          entityId: parsed.data.entityId,
          action: "document_attached",
          summary: `Document attached: ${file.title}`,
          description: `${file.title} (${file.fileNumber}) linked to ${masterEntity}`,
        });
      }

      return created;
    });

    res.status(201).json(serializeLink(link));
  })
);

router.delete(
  "/links/:id",
  requirePermission(DOCUMENTS_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = linkIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid link id" });
      return;
    }

    const existing = await prisma.documentLink.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: { documentFile: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Document link not found" });
      return;
    }

    const masterEntity = resolveMasterEntity(existing.module, existing.entityType);

    await prisma.$transaction(async (tx) => {
      await tx.documentLink.delete({ where: { id: existing.id } });

      if (masterEntity) {
        await logMasterDataEvent(tx, {
          organizationId: orgId,
          userId,
          entity: masterEntity,
          entityId: existing.entityId,
          action: "document_unlinked",
          summary: `Document unlinked: ${existing.documentFile.title}`,
          description: `${existing.documentFile.title} (${existing.documentFile.fileNumber}) unlinked from ${masterEntity}`,
        });
      }
    });

    res.status(204).send();
  })
);

export default router;

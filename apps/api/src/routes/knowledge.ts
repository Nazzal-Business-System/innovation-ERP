import { Router } from "express";
import { KNOWLEDGE_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import {
  articlesListSchema,
  articleIdSchema,
  categoriesListSchema,
  categoryIdSchema,
  createArticleSchema,
  createCategorySchema,
  ticketArticlesSchema,
  updateArticleSchema,
  updateCategorySchema,
} from "../lib/knowledge-validation.js";
import {
  serializeArticle,
  serializeArticleDetail,
  serializeCategory,
} from "../lib/serialize-knowledge.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

const articleInclude = {
  category: true,
  author: true,
  tags: { orderBy: { tag: "asc" as const } },
} as const;

const articleDetailInclude = {
  ...articleInclude,
  documents: {
    include: {
      documentFile: { select: { id: true, fileNumber: true, title: true, fileName: true } },
    },
  },
  supportTickets: {
    include: {
      supportTicket: { select: { id: true, ticketNumber: true, title: true, status: true } },
    },
  },
} as const;

const categoryInclude = {
  _count: { select: { articles: true } },
} as const;

async function createKnowledgeNotification(
  orgId: string,
  userId: string | undefined,
  type: "INFO" | "SUCCESS" | "WARNING",
  title: string,
  message: string,
  entityId: string
) {
  await prisma.notification.create({
    data: {
      organizationId: orgId,
      userId: userId ?? null,
      type,
      module: "KNOWLEDGE",
      title,
      message,
      entityType: "knowledge_article",
      entityId,
      isRead: false,
    },
  });
}

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(KNOWLEDGE_PERMISSIONS.READ));

router.get(
  "/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;

    const articles = await prisma.knowledgeArticle.findMany({
      where: { organizationId: orgId },
      include: articleInclude,
      orderBy: { updatedAt: "desc" },
    });

    const publishedArticles = articles.filter((a) => a.status === "PUBLISHED").length;
    const draftArticles = articles.filter((a) => a.status === "DRAFT").length;
    const reviewArticles = articles.filter((a) => a.status === "REVIEW").length;
    const archivedArticles = articles.filter((a) => a.status === "ARCHIVED").length;

    const categoryMap = new Map<string, { name: string; count: number }>();
    for (const article of articles) {
      if (article.categoryId && article.category) {
        const existing = categoryMap.get(article.categoryId) ?? {
          name: article.category.name,
          count: 0,
        };
        categoryMap.set(article.categoryId, { ...existing, count: existing.count + 1 });
      }
    }

    const published = articles.filter((a) => a.status === "PUBLISHED");
    const popularArticles = [...published]
      .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
      .slice(0, 5);
    const recentArticles = articles.slice(0, 6);
    const articlesInReview = articles.filter((a) => a.status === "REVIEW").slice(0, 5);

    const [supportLinkedArticles, documentLinkedArticles] = await Promise.all([
      prisma.knowledgeArticleSupportTicket.count({ where: { organizationId: orgId } }),
      prisma.knowledgeArticleDocument.count({ where: { organizationId: orgId } }),
    ]);

    res.json({
      totalArticles: articles.length,
      publishedArticles,
      draftArticles,
      reviewArticles,
      archivedArticles,
      articlesByCategory: Array.from(categoryMap.entries()).map(([categoryId, v]) => ({
        categoryId,
        name: v.name,
        count: v.count,
      })),
      popularArticles: popularArticles.map(serializeArticle),
      recentArticles: recentArticles.map(serializeArticle),
      articlesInReview: articlesInReview.map(serializeArticle),
      supportLinkedArticles,
      documentLinkedArticles,
    });
  })
);

router.get(
  "/categories",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = categoriesListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
      return;
    }

    const categories = await prisma.knowledgeCategory.findMany({
      where: {
        organizationId: orgId,
        ...(parsed.data.activeOnly === true
          ? { isActive: true }
          : parsed.data.activeOnly === false
            ? { isActive: false }
            : {}),
      },
      include: categoryInclude,
      orderBy: { name: "asc" },
    });

    res.json({ data: categories.map(serializeCategory) });
  })
);

router.post(
  "/categories",
  requirePermission(KNOWLEDGE_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }

    const code = parsed.data.code.toUpperCase();
    const existingCode = await prisma.knowledgeCategory.findFirst({
      where: { organizationId: orgId, code },
      select: { id: true },
    });
    if (existingCode) {
      res.status(409).json({ error: "A category with this code already exists" });
      return;
    }

    const category = await prisma.knowledgeCategory.create({
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

    const category = await prisma.knowledgeCategory.findFirst({
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
  requirePermission(KNOWLEDGE_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const paramsParsed = categoryIdSchema.safeParse(req.params);
    const bodyParsed = updateCategorySchema.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.knowledgeCategory.findFirst({
      where: { id: paramsParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const body = bodyParsed.data;
    const category = await prisma.knowledgeCategory.update({
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
  requirePermission(KNOWLEDGE_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = categoryIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid category id" });
      return;
    }

    const existing = await prisma.knowledgeCategory.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: categoryInclude,
    });
    if (!existing) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const articleCount = existing._count.articles;
    if (articleCount > 0) {
      res.status(409).json({
        error: "Cannot delete a category that still has articles. Archive it instead.",
        code: "KNOWLEDGE_CATEGORY_NOT_EMPTY",
        details: { articleCount },
      });
      return;
    }

    await prisma.knowledgeCategory.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

router.get(
  "/articles",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = articlesListSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
      return;
    }

    const { page, pageSize, search, categoryId, status, visibility } = parsed.data;
    const where = {
      organizationId: orgId,
      ...(categoryId ? { categoryId } : {}),
      ...(status ? { status } : {}),
      ...(visibility ? { visibility } : {}),
      ...(search
        ? {
            OR: [
              { articleNumber: { contains: search, mode: "insensitive" as const } },
              { title: { contains: search, mode: "insensitive" as const } },
              { summary: { contains: search, mode: "insensitive" as const } },
              { tags: { some: { tag: { contains: search, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    };

    const [total, articles] = await Promise.all([
      prisma.knowledgeArticle.count({ where }),
      prisma.knowledgeArticle.findMany({
        where,
        include: articleInclude,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.json({
      data: articles.map(serializeArticle),
      total,
      page,
      pageSize,
    });
  })
);

router.post(
  "/articles",
  requirePermission(KNOWLEDGE_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = createArticleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }

    const count = await prisma.knowledgeArticle.count({ where: { organizationId: orgId } });
    const articleNumber = `KB-2026-${String(count + 1).padStart(4, "0")}`;
    const status = parsed.data.status ?? "DRAFT";
    const publishedAt = status === "PUBLISHED" ? new Date() : null;

    const article = await prisma.$transaction(async (tx) => {
      const created = await tx.knowledgeArticle.create({
        data: {
          organizationId: orgId,
          articleNumber,
          title: parsed.data.title,
          summary: parsed.data.summary ?? null,
          content: parsed.data.content,
          categoryId: parsed.data.categoryId ?? null,
          visibility: parsed.data.visibility ?? "INTERNAL",
          status,
          authorId: userId,
          publishedAt,
        },
        include: articleDetailInclude,
      });

      const tags = parsed.data.tags ?? [];
      if (tags.length > 0) {
        await tx.knowledgeArticleTag.createMany({
          data: tags.map((tag) => ({
            organizationId: orgId,
            articleId: created.id,
            tag: tag.trim().toLowerCase(),
          })),
        });
      }

      return tx.knowledgeArticle.findFirstOrThrow({
        where: { id: created.id },
        include: articleDetailInclude,
      });
    });

    if (status === "REVIEW") {
      await createKnowledgeNotification(
        orgId,
        userId,
        "INFO",
        "Article submitted for review",
        `${article!.title} (${article!.articleNumber}) is awaiting review.`,
        article!.id
      );
    }

    res.status(201).json(serializeArticleDetail(article!));
  })
);

router.get(
  "/articles/by-ticket",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = ticketArticlesSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
      return;
    }

    const links = await prisma.knowledgeArticleSupportTicket.findMany({
      where: {
        organizationId: orgId,
        supportTicketId: parsed.data.supportTicketId,
      },
      include: { article: { include: articleInclude } },
    });

    res.json({ data: links.map((l) => serializeArticle(l.article)) });
  })
);

router.get(
  "/articles/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const parsed = articleIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const article = await prisma.knowledgeArticle.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
      include: articleDetailInclude,
    });

    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    res.json(serializeArticleDetail(article));
  })
);

router.patch(
  "/articles/:id",
  requirePermission(KNOWLEDGE_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const idParsed = articleIdSchema.safeParse(req.params);
    const bodyParsed = updateArticleSchema.safeParse(req.body);
    if (!idParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid request", details: bodyParsed.error?.flatten() });
      return;
    }

    const existing = await prisma.knowledgeArticle.findFirst({
      where: { id: idParsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    if (bodyParsed.data.categoryId) {
      const category = await prisma.knowledgeCategory.findFirst({
        where: { id: bodyParsed.data.categoryId, organizationId: orgId },
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

    const nextStatus = bodyParsed.data.status ?? existing.status;
    const publishedAt =
      nextStatus === "PUBLISHED" && existing.status !== "PUBLISHED"
        ? new Date()
        : existing.publishedAt;

    const article = await prisma.$transaction(async (tx) => {
      await tx.knowledgeArticle.update({
        where: { id: existing.id },
        data: {
          ...(bodyParsed.data.title !== undefined ? { title: bodyParsed.data.title } : {}),
          ...(bodyParsed.data.summary !== undefined ? { summary: bodyParsed.data.summary } : {}),
          ...(bodyParsed.data.content !== undefined ? { content: bodyParsed.data.content } : {}),
          ...(bodyParsed.data.categoryId !== undefined
            ? { categoryId: bodyParsed.data.categoryId }
            : {}),
          ...(bodyParsed.data.visibility !== undefined
            ? { visibility: bodyParsed.data.visibility }
            : {}),
          ...(bodyParsed.data.status !== undefined ? { status: bodyParsed.data.status } : {}),
          publishedAt,
        },
      });

      if (bodyParsed.data.tags) {
        await tx.knowledgeArticleTag.deleteMany({
          where: { articleId: existing.id, organizationId: orgId },
        });
        if (bodyParsed.data.tags.length > 0) {
          await tx.knowledgeArticleTag.createMany({
            data: bodyParsed.data.tags.map((tag) => ({
              organizationId: orgId,
              articleId: existing.id,
              tag: tag.trim().toLowerCase(),
            })),
          });
        }
      }

      return tx.knowledgeArticle.findFirstOrThrow({
        where: { id: existing.id },
        include: articleDetailInclude,
      });
    });

    if (nextStatus === "REVIEW" && existing.status !== "REVIEW") {
      await createKnowledgeNotification(
        orgId,
        userId,
        "INFO",
        "Article submitted for review",
        `${article.title} (${article.articleNumber}) is awaiting review.`,
        article.id
      );
    }

    res.json(serializeArticleDetail(article));
  })
);

router.patch(
  "/articles/:id/publish",
  requirePermission(KNOWLEDGE_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = articleIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const existing = await prisma.knowledgeArticle.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    if (existing.status === "ARCHIVED") {
      res.status(400).json({ error: "Cannot publish archived article" });
      return;
    }

    const article = await prisma.knowledgeArticle.update({
      where: { id: existing.id },
      data: { status: "PUBLISHED", publishedAt: existing.publishedAt ?? new Date() },
      include: articleDetailInclude,
    });

    await createKnowledgeNotification(
      orgId,
      userId,
      "SUCCESS",
      "Knowledge article published",
      `${article.title} (${article.articleNumber}) is now published.`,
      article.id
    );

    res.json(serializeArticleDetail(article));
  })
);

router.patch(
  "/articles/:id/archive",
  requirePermission(KNOWLEDGE_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = articleIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const existing = await prisma.knowledgeArticle.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    const article = await prisma.knowledgeArticle.update({
      where: { id: existing.id },
      data: { status: "ARCHIVED" },
      include: articleDetailInclude,
    });

    await createKnowledgeNotification(
      orgId,
      userId,
      "WARNING",
      "Knowledge article archived",
      `${article.title} (${article.articleNumber}) was archived.`,
      article.id
    );

    res.json(serializeArticleDetail(article));
  })
);

router.patch(
  "/articles/:id/restore",
  requirePermission(KNOWLEDGE_PERMISSIONS.WRITE),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const parsed = articleIdSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const existing = await prisma.knowledgeArticle.findFirst({
      where: { id: parsed.data.id, organizationId: orgId },
    });
    if (!existing) {
      res.status(404).json({ error: "Article not found" });
      return;
    }
    if (existing.status !== "ARCHIVED") {
      res.status(400).json({ error: "Article is not archived" });
      return;
    }

    const article = await prisma.knowledgeArticle.update({
      where: { id: existing.id },
      data: { status: "DRAFT" },
      include: articleDetailInclude,
    });

    await createKnowledgeNotification(
      orgId,
      userId,
      "SUCCESS",
      "Knowledge article restored",
      `${article.title} (${article.articleNumber}) was restored to draft.`,
      article.id
    );

    res.json(serializeArticleDetail(article));
  })
);

router.get(
  "/tags",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;

    const tags = await prisma.knowledgeArticleTag.groupBy({
      by: ["tag"],
      where: { organizationId: orgId },
      _count: { tag: true },
      orderBy: { _count: { tag: "desc" } },
    });

    res.json({
      data: tags.map((t) => ({ tag: t.tag, count: t._count.tag })),
    });
  })
);

export default router;

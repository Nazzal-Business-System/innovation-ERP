import type {
  KnowledgeArticleStatus,
  KnowledgeVisibility,
  PrismaClient,
} from "@prisma/client";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CEO_USER_ID = "00000000-0000-4000-8000-000000000020";
const HR_USER_ID = "00000000-0000-4000-8000-000000000024";
const SUPPORT_TICKET_1 = "00000000-0000-4000-8000-000000001108";
const SUPPORT_TICKET_2 = "00000000-0000-4000-8000-000000001109";
const DOC_FILE_1 = "00000000-0000-4000-8000-000000001300";
const DOC_FILE_2 = "00000000-0000-4000-8000-000000001301";

const CATEGORIES = [
  { id: "00000000-0000-4000-8000-000000001980", code: "SOP", name: "Standard Operating Procedures", description: "Day-to-day operational SOPs" },
  { id: "00000000-0000-4000-8000-000000001981", code: "PROC", name: "Procurement", description: "Purchasing and vendor management" },
  { id: "00000000-0000-4000-8000-000000001982", code: "SALES", name: "Sales & Delivery", description: "Sales order and fulfillment processes" },
  { id: "00000000-0000-4000-8000-000000001983", code: "HR", name: "HR & Payroll", description: "HR policies, payroll, and leave" },
  { id: "00000000-0000-4000-8000-000000001984", code: "SUPPORT", name: "Customer Support", description: "Support playbooks and escalation" },
  { id: "00000000-0000-4000-8000-000000001985", code: "DOCS", name: "Document Management", description: "Document lifecycle and compliance" },
  { id: "00000000-0000-4000-8000-000000001986", code: "FIN", name: "Finance & Accounting", description: "Month-end, AR/AP, and reporting" },
  { id: "00000000-0000-4000-8000-000000001987", code: "ERP", name: "ERP User Guide", description: "Innovation ERP module guides" },
];

const STATUSES: KnowledgeArticleStatus[] = [
  "PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED",
  "PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED",
  "PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED",
  "PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED", "PUBLISHED",
  "REVIEW", "REVIEW", "REVIEW", "REVIEW", "REVIEW",
  "DRAFT", "DRAFT", "DRAFT", "DRAFT", "DRAFT",
  "ARCHIVED", "ARCHIVED", "ARCHIVED", "ARCHIVED", "ARCHIVED",
];

const VISIBILITIES: KnowledgeVisibility[] = [
  "INTERNAL", "INTERNAL", "PUBLIC", "INTERNAL", "SUPPORT_ONLY",
  "INTERNAL", "PUBLIC", "INTERNAL", "INTERNAL", "SUPPORT_ONLY",
  "INTERNAL", "PUBLIC", "INTERNAL", "INTERNAL", "INTERNAL",
  "INTERNAL", "PUBLIC", "INTERNAL", "SUPPORT_ONLY", "INTERNAL",
  "INTERNAL", "INTERNAL", "SUPPORT_ONLY", "INTERNAL", "INTERNAL",
  "INTERNAL", "INTERNAL", "INTERNAL", "INTERNAL", "INTERNAL",
  "INTERNAL", "INTERNAL", "INTERNAL", "INTERNAL", "INTERNAL",
];

const ARTICLE_DEFS = [
  { title: "Inventory Stock Count SOP", summary: "Monthly cycle count procedure for all warehouses", category: 0, tags: ["inventory", "sop", "warehouse"] },
  { title: "Purchase Order Approval Process", summary: "Approval thresholds and workflow for POs", category: 1, tags: ["procurement", "approval", "po"] },
  { title: "Sales Order Delivery Process", summary: "From order confirmation to goods delivery", category: 2, tags: ["sales", "delivery", "operations"] },
  { title: "Monthly Payroll Checklist", summary: "HR payroll run steps before processing", category: 3, tags: ["hr", "payroll", "checklist"] },
  { title: "Employee Leave Policy", summary: "Annual, sick, and emergency leave rules", category: 3, tags: ["hr", "leave", "policy"] },
  { title: "Customer Support Escalation Matrix", summary: "When and how to escalate support tickets", category: 4, tags: ["support", "escalation", "sla"] },
  { title: "Document Expiry Management", summary: "Tracking and renewing expiring documents", category: 5, tags: ["documents", "expiry", "compliance"] },
  { title: "Finance Month-End Closing", summary: "Month-end close checklist for finance team", category: 6, tags: ["finance", "month-end", "accounting"] },
  { title: "Warehouse Transfer Guidelines", summary: "Inter-warehouse stock transfer SOP", category: 0, tags: ["inventory", "transfer", "sop"] },
  { title: "Vendor Onboarding Checklist", summary: "Steps to register a new vendor", category: 1, tags: ["procurement", "vendor", "onboarding"] },
  { title: "Customer Credit Limit Policy", summary: "Credit approval and monitoring rules", category: 2, tags: ["sales", "credit", "policy"] },
  { title: "Goods Receipt Inspection", summary: "Quality checks on inbound goods", category: 0, tags: ["inventory", "grn", "quality"] },
  { title: "Support Ticket Triage Guide", summary: "Priority assignment and first response", category: 4, tags: ["support", "triage", "sla"] },
  { title: "CRM Lead Qualification", summary: "BANT criteria for qualifying leads", category: 7, tags: ["crm", "leads", "sales"] },
  { title: "Project Milestone Sign-off", summary: "Milestone acceptance and billing triggers", category: 7, tags: ["projects", "milestones", "billing"] },
  { title: "AR Collection Follow-up", summary: "Overdue invoice collection procedure", category: 6, tags: ["finance", "ar", "collections"] },
  { title: "Safety Stock Calculation", summary: "How to set reorder levels in ERP", category: 0, tags: ["inventory", "reorder", "erp"] },
  { title: "PO Three-Way Match", summary: "PO, GRN, and vendor bill reconciliation", category: 1, tags: ["procurement", "finance", "matching"] },
  { title: "Delivery Route Planning", summary: "Daily delivery scheduling SOP", category: 2, tags: ["operations", "delivery", "logistics"] },
  { title: "Attendance Exception Handling", summary: "Missing punch and overtime approvals", category: 3, tags: ["hr", "attendance", "policy"] },
  { title: "New Employee Onboarding", summary: "First-week checklist for new hires", category: 3, tags: ["hr", "onboarding", "checklist"] },
  { title: "Support KB Article Writing Guide", summary: "How to author support articles", category: 4, tags: ["support", "knowledge", "writing"] },
  { title: "Document Upload Standards", summary: "Naming, categories, and metadata rules", category: 5, tags: ["documents", "upload", "metadata"] },
  { title: "Trial Balance Review", summary: "Pre-close trial balance checks", category: 6, tags: ["accounting", "trial-balance", "close"] },
  { title: "Dashboard KPI Definitions", summary: "CEO dashboard metric definitions", category: 7, tags: ["erp", "dashboard", "kpi"] },
  { title: "Inventory Valuation Methods", summary: "FIFO and weighted average in ERP", category: 0, tags: ["inventory", "valuation", "accounting"] },
  { title: "Emergency PO Procedure", summary: "Expedited purchase order process", category: 1, tags: ["procurement", "emergency", "po"] },
  { title: "Returns and Credit Notes", summary: "Customer return handling workflow", category: 2, tags: ["sales", "returns", "credit"] },
  { title: "Contract Renewal Process", summary: "Employee contract renewal timeline", category: 3, tags: ["hr", "contracts", "renewal"] },
  { title: "WhatsApp Support Guidelines", summary: "Using WhatsApp channel for support", category: 4, tags: ["support", "whatsapp", "channel"] },
  { title: "Archived: Legacy PO Form", summary: "Deprecated paper PO form (archived)", category: 1, tags: ["archived", "procurement"] },
  { title: "Archived: 2024 Leave Policy", summary: "Superseded leave policy", category: 3, tags: ["archived", "hr"] },
  { title: "Archived: Old GRN Process", summary: "Pre-ERP goods receipt process", category: 0, tags: ["archived", "inventory"] },
  { title: "Archived: Manual Invoice Template", summary: "Excel invoice template (retired)", category: 6, tags: ["archived", "finance"] },
  { title: "Archived: Support Phone Script v1", summary: "Original phone support script", category: 4, tags: ["archived", "support"] },
];

function padId(n: number) {
  return `00000000-0000-4000-8000-00000000${String(n).padStart(4, "0")}`;
}

function articleContent(title: string): string {
  return `# ${title}

## Purpose
This article defines the standard procedure for **${title.toLowerCase()}** at Al-Noor Trading Company.

## Scope
Applies to all authorized ERP users in the relevant department.

## Procedure
1. Review prerequisites and open the related ERP module.
2. Follow the checklist steps in order — do not skip validation steps.
3. Record evidence (attachments, approvals) in Documents when required.
4. Escalate blockers to the department manager within one business day.

## Related modules
- Innovation ERP Dashboard
- Linked records in Documents and Support (where applicable)

## Revision history
- v1.0 — Initial publication for Knowledge Base V1 demo seed.`;
}

/**
 * Idempotent knowledge backfill for an existing organization.
 * Does NOT delete existing articles. Upserts by articleNumber / category code.
 * Safe to run twice. Skips optional ticket/doc links when targets are missing.
 */
export async function backfillKnowledgeIdempotent(
  prisma: PrismaClient,
  organizationId: string,
  options: { authorUserIds?: string[] } = {}
) {
  let authors = options.authorUserIds ?? [];
  if (authors.length === 0) {
    const users = await prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: { id: true },
      take: 5,
      orderBy: { createdAt: "asc" },
    });
    authors = users.map((u) => u.id);
  }
  if (authors.length === 0) {
    throw new Error(
      `No active users in organization ${organizationId} to author knowledge articles`
    );
  }

  for (const cat of CATEGORIES) {
    await prisma.knowledgeCategory.upsert({
      where: { organizationId_code: { organizationId, code: cat.code } },
      update: { name: cat.name, description: cat.description, isActive: true },
      create: {
        ...(organizationId === ORG_ID ? { id: cat.id } : {}),
        organizationId,
        code: cat.code,
        name: cat.name,
        description: cat.description,
        isActive: true,
      },
    });
  }

  const categories = await prisma.knowledgeCategory.findMany({
    where: { organizationId },
  });
  const categoryByCode = new Map(categories.map((c) => [c.code, c]));

  const baseDate = new Date("2026-06-01T09:00:00Z");
  let created = 0;
  let updated = 0;
  let tagsCreated = 0;

  for (let i = 0; i < ARTICLE_DEFS.length; i++) {
    const def = ARTICLE_DEFS[i]!;
    const status = STATUSES[i]!;
    const visibility = VISIBILITIES[i]!;
    const catCode = CATEGORIES[def.category]!.code;
    const category = categoryByCode.get(catCode);
    if (!category) continue;

    const articleNumber = `KB-2026-${String(i + 1).padStart(4, "0")}`;
    const publishedAt =
      status === "PUBLISHED" ? new Date(baseDate.getTime() + i * 86400000) : null;
    const authorId = authors[i % authors.length]!;

    const existing = await prisma.knowledgeArticle.findFirst({
      where: { organizationId, articleNumber },
      select: { id: true },
    });

    const articleId =
      existing?.id ?? (organizationId === ORG_ID ? padId(2000 + i) : undefined);

    if (existing) {
      // Preserve user-modified articles — only ensure tags below.
      updated += 1;
    } else {
      await prisma.knowledgeArticle.create({
        data: {
          ...(articleId ? { id: articleId } : {}),
          organizationId,
          categoryId: category.id,
          articleNumber,
          title: def.title,
          summary: def.summary,
          content: articleContent(def.title),
          status,
          visibility,
          authorId,
          publishedAt,
          updatedAt: new Date(baseDate.getTime() + (i + 5) * 86400000),
          createdAt: new Date(baseDate.getTime() + i * 43200000),
        },
      });
      created += 1;
    }

    const article = await prisma.knowledgeArticle.findFirstOrThrow({
      where: { organizationId, articleNumber },
      select: { id: true },
    });

    for (const tag of def.tags) {
      const tagExists = await prisma.knowledgeArticleTag.findFirst({
        where: { organizationId, articleId: article.id, tag },
        select: { id: true },
      });
      if (!tagExists) {
        await prisma.knowledgeArticleTag.create({
          data: { organizationId, articleId: article.id, tag },
        });
        tagsCreated += 1;
      }
    }
  }

  // Optional links — only for demo org when related seed rows exist
  let ticketLinks = 0;
  let documentLinks = 0;
  if (organizationId === ORG_ID) {
    const ticketLinkDefs = [
      { articleNumber: "KB-2026-0001", ticketId: SUPPORT_TICKET_1 },
      { articleNumber: "KB-2026-0006", ticketId: SUPPORT_TICKET_1 },
      { articleNumber: "KB-2026-0006", ticketId: SUPPORT_TICKET_2 },
      { articleNumber: "KB-2026-0013", ticketId: SUPPORT_TICKET_1 },
      { articleNumber: "KB-2026-0020", ticketId: SUPPORT_TICKET_2 },
      { articleNumber: "KB-2026-0022", ticketId: SUPPORT_TICKET_1 },
      { articleNumber: "KB-2026-0030", ticketId: SUPPORT_TICKET_2 },
      { articleNumber: "KB-2026-0035", ticketId: SUPPORT_TICKET_1 },
    ];
    for (const link of ticketLinkDefs) {
      const article = await prisma.knowledgeArticle.findFirst({
        where: { organizationId, articleNumber: link.articleNumber },
      });
      const ticket = await prisma.supportTicket.findFirst({
        where: { id: link.ticketId, organizationId },
      });
      if (!article || !ticket) continue;
      const exists = await prisma.knowledgeArticleSupportTicket.findFirst({
        where: {
          organizationId,
          articleId: article.id,
          supportTicketId: ticket.id,
        },
      });
      if (!exists) {
        await prisma.knowledgeArticleSupportTicket.create({
          data: {
            organizationId,
            articleId: article.id,
            supportTicketId: ticket.id,
          },
        });
        ticketLinks += 1;
      }
    }

    const docLinkDefs = [
      { articleNumber: "KB-2026-0001", documentFileId: DOC_FILE_1 },
      { articleNumber: "KB-2026-0007", documentFileId: DOC_FILE_1 },
      { articleNumber: "KB-2026-0007", documentFileId: DOC_FILE_2 },
      { articleNumber: "KB-2026-0023", documentFileId: DOC_FILE_1 },
      { articleNumber: "KB-2026-0008", documentFileId: DOC_FILE_2 },
      { articleNumber: "KB-2026-0018", documentFileId: DOC_FILE_1 },
    ];
    for (const link of docLinkDefs) {
      const article = await prisma.knowledgeArticle.findFirst({
        where: { organizationId, articleNumber: link.articleNumber },
      });
      const file = await prisma.documentFile.findFirst({
        where: { id: link.documentFileId, organizationId },
      });
      if (!article || !file) continue;
      const exists = await prisma.knowledgeArticleDocument.findFirst({
        where: {
          organizationId,
          articleId: article.id,
          documentFileId: file.id,
        },
      });
      if (!exists) {
        await prisma.knowledgeArticleDocument.create({
          data: {
            organizationId,
            articleId: article.id,
            documentFileId: file.id,
          },
        });
        documentLinks += 1;
      }
    }
  }

  const totals = {
    categories: await prisma.knowledgeCategory.count({ where: { organizationId } }),
    articles: await prisma.knowledgeArticle.count({ where: { organizationId } }),
    published: await prisma.knowledgeArticle.count({
      where: { organizationId, status: "PUBLISHED" },
    }),
    tags: await prisma.knowledgeArticleTag.count({ where: { organizationId } }),
  };

  return {
    created,
    updated,
    tagsCreated,
    ticketLinks,
    documentLinks,
    totals,
  };
}

export async function seedKnowledge(prisma: PrismaClient) {
  await prisma.knowledgeArticleSupportTicket.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.knowledgeArticleDocument.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.knowledgeArticleTag.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.knowledgeArticle.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.knowledgeCategory.deleteMany({ where: { organizationId: ORG_ID } });

  const result = await backfillKnowledgeIdempotent(prisma, ORG_ID, {
    authorUserIds: [CEO_USER_ID, HR_USER_ID],
  });

  return {
    categories: result.totals.categories,
    articles: result.totals.articles,
    ticketLinks: result.ticketLinks,
    documentLinks: result.documentLinks,
  };
}

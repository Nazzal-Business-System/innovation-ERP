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

export async function seedKnowledge(prisma: PrismaClient) {
  await prisma.knowledgeArticleSupportTicket.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.knowledgeArticleDocument.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.knowledgeArticleTag.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.knowledgeArticle.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.knowledgeCategory.deleteMany({ where: { organizationId: ORG_ID } });

  for (const cat of CATEGORIES) {
    await prisma.knowledgeCategory.upsert({
      where: { organizationId_code: { organizationId: ORG_ID, code: cat.code } },
      update: { name: cat.name, description: cat.description, isActive: true },
      create: { ...cat, organizationId: ORG_ID, isActive: true },
    });
  }

  const baseDate = new Date("2026-06-01T09:00:00Z");

  for (let i = 0; i < ARTICLE_DEFS.length; i++) {
    const def = ARTICLE_DEFS[i]!;
    const status = STATUSES[i]!;
    const visibility = VISIBILITIES[i]!;
    const category = CATEGORIES[def.category]!;
    const publishedAt =
      status === "PUBLISHED" ? new Date(baseDate.getTime() + i * 86400000) : null;
    const updatedAt = new Date(baseDate.getTime() + (i + 5) * 86400000);

    await prisma.knowledgeArticle.create({
      data: {
        id: padId(2000 + i),
        organizationId: ORG_ID,
        categoryId: category.id,
        articleNumber: `KB-2026-${String(i + 1).padStart(4, "0")}`,
        title: def.title,
        summary: def.summary,
        content: articleContent(def.title),
        status,
        visibility,
        authorId: i % 3 === 0 ? HR_USER_ID : CEO_USER_ID,
        publishedAt,
        updatedAt,
        createdAt: new Date(baseDate.getTime() + i * 43200000),
      },
    });

    for (const tag of def.tags) {
      await prisma.knowledgeArticleTag.create({
        data: {
          organizationId: ORG_ID,
          articleId: padId(2000 + i),
          tag,
        },
      });
    }
  }

  const ticketLinks = [
    { articleId: padId(2000), ticketId: SUPPORT_TICKET_1 },
    { articleId: padId(2005), ticketId: SUPPORT_TICKET_1 },
    { articleId: padId(2005), ticketId: SUPPORT_TICKET_2 },
    { articleId: padId(2012), ticketId: SUPPORT_TICKET_1 },
    { articleId: padId(2019), ticketId: SUPPORT_TICKET_2 },
    { articleId: padId(2021), ticketId: SUPPORT_TICKET_1 },
    { articleId: padId(2029), ticketId: SUPPORT_TICKET_2 },
    { articleId: padId(2034), ticketId: SUPPORT_TICKET_1 },
  ];

  for (const link of ticketLinks) {
    await prisma.knowledgeArticleSupportTicket.create({
      data: {
        organizationId: ORG_ID,
        articleId: link.articleId,
        supportTicketId: link.ticketId,
      },
    });
  }

  const docLinks = [
    { articleId: padId(2000), documentFileId: DOC_FILE_1 },
    { articleId: padId(2006), documentFileId: DOC_FILE_1 },
    { articleId: padId(2006), documentFileId: DOC_FILE_2 },
    { articleId: padId(2022), documentFileId: DOC_FILE_1 },
    { articleId: padId(2007), documentFileId: DOC_FILE_2 },
    { articleId: padId(2017), documentFileId: DOC_FILE_1 },
  ];

  for (const link of docLinks) {
    await prisma.knowledgeArticleDocument.create({
      data: {
        organizationId: ORG_ID,
        articleId: link.articleId,
        documentFileId: link.documentFileId,
      },
    });
  }

  return {
    categories: CATEGORIES.length,
    articles: ARTICLE_DEFS.length,
    ticketLinks: ticketLinks.length,
    documentLinks: docLinks.length,
  };
}

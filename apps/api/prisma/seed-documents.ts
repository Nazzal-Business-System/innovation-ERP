import type { DocumentModule, ErpDocumentStatus, PrismaClient } from "@prisma/client";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CEO_USER_ID = "00000000-0000-4000-8000-000000000020";
const FINANCE_USER_ID = "00000000-0000-4000-8000-000000000021";
const INVENTORY_USER_ID = "00000000-0000-4000-8000-000000000022";
const SALES_USER_ID = "00000000-0000-4000-8000-000000000023";
const HR_USER_ID = "00000000-0000-4000-8000-000000000024";

const EMPLOYEE_CEO = "00000000-0000-4000-8000-000000000730";
const EMPLOYEE_FINANCE = "00000000-0000-4000-8000-000000000731";
const CONTRACT_1 = "00000000-0000-4000-8000-000000000950";
const VENDOR_BILL_1 = "00000000-0000-4000-8000-000000000940";
const CUSTOMER_INV_1 = "00000000-0000-4000-8000-000000000900";
const SUPPORT_TICKET_1 = "00000000-0000-4000-8000-000000001108";
const PROJECT_ERP = "00000000-0000-4000-8000-000000000900";
const PO_1 = "00000000-0000-4000-8000-000000000400";
const SO_1 = "00000000-0000-4000-8000-000000000620";

const CATEGORIES = [
  { id: "00000000-0000-4000-8000-000000001200", code: "CONTRACT", name: "Contracts & Agreements", description: "Employment, vendor, and customer contracts" },
  { id: "00000000-0000-4000-8000-000000001201", code: "INVOICE", name: "Invoices & Bills", description: "Customer invoices and vendor bills" },
  { id: "00000000-0000-4000-8000-000000001202", code: "COMPLIANCE", name: "Compliance & Licenses", description: "Regulatory licenses, permits, certifications" },
  { id: "00000000-0000-4000-8000-000000001203", code: "HR_DOC", name: "HR Documents", description: "Employee records, IDs, certificates" },
  { id: "00000000-0000-4000-8000-000000001204", code: "FINANCE", name: "Financial Statements", description: "Reports, audits, bank statements" },
  { id: "00000000-0000-4000-8000-000000001205", code: "PROJECT", name: "Project Deliverables", description: "Specs, designs, acceptance documents" },
  { id: "00000000-0000-4000-8000-000000001206", code: "SUPPORT", name: "Support Attachments", description: "Screenshots, logs, customer correspondence" },
  { id: "00000000-0000-4000-8000-000000001207", code: "POLICY", name: "Policies & Procedures", description: "Internal policies, SOPs, manuals" },
];

const MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const TITLES = [
  "Employment Contract — Signed Copy",
  "National ID Scan",
  "Vendor Invoice Attachment",
  "Customer PO Confirmation",
  "Project Scope Document",
  "Support Ticket Screenshot",
  "Warehouse Safety Certificate",
  "Tax Registration Certificate",
  "Bank Guarantee Letter",
  "Insurance Policy Document",
  "Delivery Note Scan",
  "Goods Receipt Photo",
  "Payroll Authorization Form",
  "Leave Request Supporting Doc",
  "Purchase Order Amendment",
  "Sales Quotation PDF",
  "ERP Training Completion",
  "Quality Inspection Report",
  "Audit Trail Export",
  "System Configuration Backup",
];

type LinkSeed = {
  module: DocumentModule;
  entityType: string;
  entityId: string;
};

const LINK_TARGETS: LinkSeed[] = [
  { module: "HR", entityType: "employee", entityId: EMPLOYEE_CEO },
  { module: "HR", entityType: "employee", entityId: EMPLOYEE_FINANCE },
  { module: "HR", entityType: "employee_contract", entityId: CONTRACT_1 },
  { module: "FINANCE", entityType: "vendor_bill", entityId: VENDOR_BILL_1 },
  { module: "FINANCE", entityType: "customer_invoice", entityId: CUSTOMER_INV_1 },
  { module: "SUPPORT", entityType: "support_ticket", entityId: SUPPORT_TICKET_1 },
  { module: "PROJECTS", entityType: "project", entityId: PROJECT_ERP },
  { module: "PROCUREMENT", entityType: "purchase_order", entityId: PO_1 },
  { module: "SALES", entityType: "sales_order", entityId: SO_1 },
  { module: "OPERATIONS", entityType: "purchase_order", entityId: PO_1 },
  { module: "ACCOUNTING", entityType: "customer_invoice", entityId: CUSTOMER_INV_1 },
  { module: "SYSTEM", entityType: "organization", entityId: ORG_ID },
];

function daysAgo(d: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(10, 0, 0, 0);
  return date;
}

function daysFromNow(d: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(17, 0, 0, 0);
  return date;
}

function padId(n: number): string {
  return `00000000-0000-4000-8000-00000000${String(n).padStart(4, "0")}`;
}

const UPLOADERS = [CEO_USER_ID, FINANCE_USER_ID, INVENTORY_USER_ID, SALES_USER_ID, HR_USER_ID];

export async function seedDocuments(prisma: PrismaClient) {
  await prisma.documentLink.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.documentFile.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.documentCategory.deleteMany({ where: { organizationId: ORG_ID } });

  for (const cat of CATEGORIES) {
    await prisma.documentCategory.upsert({
      where: { id: cat.id },
      create: {
        id: cat.id,
        organizationId: ORG_ID,
        code: cat.code,
        name: cat.name,
        description: cat.description,
        isActive: true,
      },
      update: { code: cat.code, name: cat.name, description: cat.description, isActive: true },
    });
  }

  let linkCounter = 1400;
  let fileCount = 0;

  for (let i = 0; i < 60; i++) {
    const fileId = padId(1300 + i);
    const fileNumber = `DOC-2026-${String(i + 1).padStart(4, "0")}`;
    const category = CATEGORIES[i % CATEGORIES.length];
    const title = `${TITLES[i % TITLES.length]} #${i + 1}`;
    const mimeType = MIME_TYPES[i % MIME_TYPES.length];
    const ext = mimeType.includes("pdf") ? "pdf" : mimeType.includes("png") ? "png" : mimeType.includes("jpeg") ? "jpg" : mimeType.includes("word") ? "docx" : mimeType.includes("sheet") ? "xlsx" : "txt";
    const fileName = `${fileNumber.toLowerCase()}-${title.replace(/[^a-z0-9]+/gi, "-").slice(0, 30)}.${ext}`;

    let status: ErpDocumentStatus = "ACTIVE";
    let expiryDate: Date | null = daysFromNow(180 + (i % 120));

    if (i % 11 === 0) {
      status = "EXPIRED";
      expiryDate = daysAgo(15 + (i % 30));
    } else if (i % 9 === 0) {
      status = "PENDING_REVIEW";
      expiryDate = daysFromNow(90);
    } else if (i % 13 === 0) {
      status = "ARCHIVED";
      expiryDate = daysAgo(60);
    } else if (i % 7 === 0) {
      expiryDate = daysFromNow(5 + (i % 20));
    } else if (i % 5 === 0) {
      expiryDate = daysAgo(5);
      if (status === "ACTIVE") status = "EXPIRED";
    }

    const uploadedAt = daysAgo(1 + (i % 45));

    await prisma.documentFile.upsert({
      where: { id: fileId },
      create: {
        id: fileId,
        organizationId: ORG_ID,
        categoryId: category.id,
        fileNumber,
        title,
        description: `Seeded document metadata for ${category.name}`,
        fileName,
        fileUrl: `/storage/placeholder/${fileNumber}/${fileName}`,
        mimeType,
        fileSize: 1024 * (50 + (i % 500)),
        status,
        expiryDate,
        uploadedById: UPLOADERS[i % UPLOADERS.length],
        uploadedAt,
      },
      update: {
        categoryId: category.id,
        fileNumber,
        title,
        fileName,
        fileUrl: `/storage/placeholder/${fileNumber}/${fileName}`,
        mimeType,
        fileSize: 1024 * (50 + (i % 500)),
        status,
        expiryDate,
        uploadedById: UPLOADERS[i % UPLOADERS.length],
        uploadedAt,
      },
    });
    fileCount++;

    const linkTarget = LINK_TARGETS[i % LINK_TARGETS.length];
    await prisma.documentLink.create({
      data: {
        id: padId(linkCounter++),
        organizationId: ORG_ID,
        documentFileId: fileId,
        module: linkTarget.module,
        entityType: linkTarget.entityType,
        entityId: linkTarget.entityId,
      },
    });

    if (i % 4 === 0) {
      const secondTarget = LINK_TARGETS[(i + 3) % LINK_TARGETS.length];
      await prisma.documentLink.create({
        data: {
          id: padId(linkCounter++),
          organizationId: ORG_ID,
          documentFileId: fileId,
          module: secondTarget.module,
          entityType: secondTarget.entityType,
          entityId: secondTarget.entityId,
        },
      });
    }
  }

  return {
    categories: CATEGORIES.length,
    files: fileCount,
    links: linkCounter - 1400,
  };
}

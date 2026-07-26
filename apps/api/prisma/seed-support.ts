import type { PrismaClient, TicketPriority, TicketSource, TicketStatus } from "@prisma/client";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CEO_USER_ID = "00000000-0000-4000-8000-000000000020";
const FINANCE_USER_ID = "00000000-0000-4000-8000-000000000021";
const INVENTORY_USER_ID = "00000000-0000-4000-8000-000000000022";
const SALES_USER_ID = "00000000-0000-4000-8000-000000000023";
const HR_USER_ID = "00000000-0000-4000-8000-000000000024";
const BRANCH_USER_ID = "00000000-0000-4000-8000-000000000025";

const CUSTOMER_609 = "00000000-0000-4000-8000-000000000609";
const CUSTOMER_606 = "00000000-0000-4000-8000-000000000606";
const CUSTOMER_613 = "00000000-0000-4000-8000-000000000613";
const CUSTOMER_601 = "00000000-0000-4000-8000-000000000601";

const PROJECT_ERP = "00000000-0000-4000-8000-000000000900";
const PROJECT_WH = "00000000-0000-4000-8000-000000000901";
const PROJECT_CRM = "00000000-0000-4000-8000-000000000902";

const CATEGORIES = [
  { id: "00000000-0000-4000-8000-000000001100", code: "TECH", name: "Technical Support", description: "Software, hardware, and system issues" },
  { id: "00000000-0000-4000-8000-000000001101", code: "BILLING", name: "Billing & Invoicing", description: "Invoice disputes, payment issues, credit notes" },
  { id: "00000000-0000-4000-8000-000000001102", code: "DELIVERY", name: "Delivery Issues", description: "Late deliveries, damaged goods, routing" },
  { id: "00000000-0000-4000-8000-000000001103", code: "PRODUCT", name: "Product Quality", description: "Defective products, returns, quality complaints" },
  { id: "00000000-0000-4000-8000-000000001104", code: "ACCESS", name: "System Access", description: "Login issues, permissions, password resets" },
  { id: "00000000-0000-4000-8000-000000001105", code: "ERP", name: "ERP Implementation", description: "ERP rollout, training, configuration requests" },
  { id: "00000000-0000-4000-8000-000000001106", code: "TRAINING", name: "Training & Onboarding", description: "User training, documentation, onboarding" },
  { id: "00000000-0000-4000-8000-000000001107", code: "GENERAL", name: "General Inquiry", description: "Other customer and internal requests" },
];

type TicketSeed = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  categoryId: string;
  customerId?: string;
  projectId?: string;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;
  assignedToId?: string;
  openedAt: Date;
  dueAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
};

function daysAgo(d: number, hour = 10): Date {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function daysFromNow(d: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + d);
  date.setHours(17, 0, 0, 0);
  return date;
}

const TICKETS: TicketSeed[] = [
  { id: "00000000-0000-4000-8000-000000001108", ticketNumber: "TKT-2026-0001", title: "Cannot access inventory module", description: "User reports 403 error when opening inventory dashboard after role change.", categoryId: CATEGORIES[4].id, customerId: CUSTOMER_601, priority: "HIGH", status: "IN_PROGRESS", source: "EMAIL", assignedToId: INVENTORY_USER_ID, openedAt: daysAgo(2), dueAt: daysFromNow(1) },
  { id: "00000000-0000-4000-8000-000000001109", ticketNumber: "TKT-2026-0002", title: "Invoice INV-2026-0012 amount mismatch", description: "Customer claims billed amount differs from PO by JOD 240.", categoryId: CATEGORIES[1].id, customerId: CUSTOMER_609, priority: "HIGH", status: "OPEN", source: "PHONE", assignedToId: FINANCE_USER_ID, openedAt: daysAgo(1), dueAt: daysFromNow(2) },
  { id: "00000000-0000-4000-8000-000000001110", ticketNumber: "TKT-2026-0003", title: "Late delivery to Irbid branch", description: "SO-2026-0018 delayed 3 days. Customer requesting status update.", categoryId: CATEGORIES[2].id, customerId: CUSTOMER_606, priority: "MEDIUM", status: "WAITING_CUSTOMER", source: "WHATSAPP", assignedToId: SALES_USER_ID, openedAt: daysAgo(4), dueAt: daysAgo(1) },
  { id: "00000000-0000-4000-8000-000000001111", ticketNumber: "TKT-2026-0004", title: "Damaged sunflower oil shipment", description: "12 cartons arrived with leaking containers. Photos attached by warehouse.", categoryId: CATEGORIES[3].id, customerId: CUSTOMER_613, priority: "CRITICAL", status: "IN_PROGRESS", source: "PORTAL", assignedToId: INVENTORY_USER_ID, openedAt: daysAgo(1), dueAt: daysAgo(0) },
  { id: "00000000-0000-4000-8000-000000001112", ticketNumber: "TKT-2026-0005", title: "ERP UAT sign-off blocked", description: "Finance team cannot post journal entries in UAT environment.", categoryId: CATEGORIES[5].id, projectId: PROJECT_ERP, priority: "CRITICAL", status: "OPEN", source: "INTERNAL", assignedToId: CEO_USER_ID, openedAt: daysAgo(3), dueAt: daysAgo(2) },
  { id: "00000000-0000-4000-8000-000000001113", ticketNumber: "TKT-2026-0006", title: "Password reset for branch manager", description: "Branch manager locked out after password expiry.", categoryId: CATEGORIES[4].id, priority: "MEDIUM", status: "RESOLVED", source: "PHONE", assignedToId: HR_USER_ID, openedAt: daysAgo(5), dueAt: daysAgo(3), resolvedAt: daysAgo(4) },
  { id: "00000000-0000-4000-8000-000000001114", ticketNumber: "TKT-2026-0007", title: "Request CRM training session", description: "Sales team needs hands-on CRM training for 8 users.", categoryId: CATEGORIES[6].id, projectId: PROJECT_CRM, priority: "LOW", status: "OPEN", source: "EMAIL", assignedToId: SALES_USER_ID, openedAt: daysAgo(6), dueAt: daysFromNow(7) },
  { id: "00000000-0000-4000-8000-000000001115", ticketNumber: "TKT-2026-0008", title: "Barcode scanner not syncing", description: "Warehouse handheld scanner fails to sync stock movements.", categoryId: CATEGORIES[0].id, projectId: PROJECT_WH, priority: "HIGH", status: "IN_PROGRESS", source: "INTERNAL", assignedToId: INVENTORY_USER_ID, openedAt: daysAgo(2), dueAt: daysFromNow(1) },
  { id: "00000000-0000-4000-8000-000000001116", ticketNumber: "TKT-2026-0009", title: "Credit limit increase request", description: "Customer CUS-010 requests credit limit raise from 50K to 80K JOD.", categoryId: CATEGORIES[7].id, customerId: CUSTOMER_609, priority: "MEDIUM", status: "WAITING_CUSTOMER", source: "EMAIL", assignedToId: FINANCE_USER_ID, openedAt: daysAgo(7), dueAt: daysFromNow(3) },
  { id: "00000000-0000-4000-8000-000000001117", ticketNumber: "TKT-2026-0010", title: "Report export failing", description: "Sales summary report times out when exporting to Excel.", categoryId: CATEGORIES[0].id, priority: "MEDIUM", status: "OPEN", source: "PORTAL", assignedToId: CEO_USER_ID, openedAt: daysAgo(1), dueAt: daysFromNow(4) },
  { id: "00000000-0000-4000-8000-000000001118", ticketNumber: "TKT-2026-0011", title: "Wrong product shipped", description: "Customer received SKU GRC-003 instead of GRC-001.", categoryId: CATEGORIES[3].id, customerId: CUSTOMER_606, priority: "HIGH", status: "RESOLVED", source: "PHONE", assignedToId: SALES_USER_ID, openedAt: daysAgo(10), dueAt: daysAgo(7), resolvedAt: daysAgo(8) },
  { id: "00000000-0000-4000-8000-000000001119", ticketNumber: "TKT-2026-0012", title: "Vendor payment not reflected", description: "VP-2026-0004 not showing on vendor statement.", categoryId: CATEGORIES[1].id, priority: "HIGH", status: "CLOSED", source: "INTERNAL", assignedToId: FINANCE_USER_ID, openedAt: daysAgo(14), dueAt: daysAgo(10), resolvedAt: daysAgo(11), closedAt: daysAgo(10) },
  { id: "00000000-0000-4000-8000-000000001120", ticketNumber: "TKT-2026-0013", title: "Mobile app login loop", description: "Field sales app redirects to login after every action.", categoryId: CATEGORIES[0].id, priority: "CRITICAL", status: "IN_PROGRESS", source: "EMAIL", assignedToId: SALES_USER_ID, openedAt: daysAgo(0), dueAt: daysFromNow(1) },
  { id: "00000000-0000-4000-8000-000000001121", ticketNumber: "TKT-2026-0014", title: "PO approval workflow stuck", description: "PO-2026-0015 pending approval for 5 days.", categoryId: CATEGORIES[0].id, priority: "MEDIUM", status: "OPEN", source: "INTERNAL", assignedToId: INVENTORY_USER_ID, openedAt: daysAgo(5), dueAt: daysAgo(1) },
  { id: "00000000-0000-4000-8000-000000001122", ticketNumber: "TKT-2026-0015", title: "Arabic RTL layout issue on invoices", description: "Invoice PDF shows reversed column order in Arabic.", categoryId: CATEGORIES[0].id, customerId: CUSTOMER_613, priority: "MEDIUM", status: "IN_PROGRESS", source: "PORTAL", assignedToId: CEO_USER_ID, openedAt: daysAgo(3), dueAt: daysFromNow(2) },
  { id: "00000000-0000-4000-8000-000000001123", ticketNumber: "TKT-2026-0016", title: "New employee ERP access", description: "Onboard 3 warehouse staff with inventory read access.", categoryId: CATEGORIES[4].id, priority: "LOW", status: "OPEN", source: "INTERNAL", assignedToId: HR_USER_ID, openedAt: daysAgo(2), dueAt: daysFromNow(5) },
  { id: "00000000-0000-4000-8000-000000001124", ticketNumber: "TKT-2026-0017", title: "Stock count discrepancy", description: "Amman HQ count shows -45 units for GRC-007.", categoryId: CATEGORIES[3].id, priority: "HIGH", status: "WAITING_CUSTOMER", source: "INTERNAL", assignedToId: INVENTORY_USER_ID, openedAt: daysAgo(4), dueAt: daysAgo(2) },
  { id: "00000000-0000-4000-8000-000000001125", ticketNumber: "TKT-2026-0018", title: "Customer portal password reset", description: "Portal user cannot reset password — email not received.", categoryId: CATEGORIES[4].id, customerId: CUSTOMER_601, priority: "MEDIUM", status: "RESOLVED", source: "EMAIL", assignedToId: SALES_USER_ID, openedAt: daysAgo(8), dueAt: daysAgo(6), resolvedAt: daysAgo(7) },
  { id: "00000000-0000-4000-8000-000000001126", ticketNumber: "TKT-2026-0019", title: "Warehouse transfer approval delay", description: "Transfer TRF-2026-0002 stuck in pending status.", categoryId: CATEGORIES[2].id, priority: "MEDIUM", status: "OPEN", source: "INTERNAL", assignedToId: INVENTORY_USER_ID, openedAt: daysAgo(1), dueAt: daysFromNow(2) },
  { id: "00000000-0000-4000-8000-000000001127", ticketNumber: "TKT-2026-0020", title: "Payroll export format issue", description: "Bank file export missing employee IBAN column.", categoryId: CATEGORIES[0].id, priority: "HIGH", status: "IN_PROGRESS", source: "INTERNAL", assignedToId: HR_USER_ID, openedAt: daysAgo(2), dueAt: daysFromNow(1) },
  { id: "00000000-0000-4000-8000-000000001128", ticketNumber: "TKT-2026-0021", title: "Duplicate invoice generated", description: "System created two invoices for SO-2026-0020.", categoryId: CATEGORIES[1].id, customerId: CUSTOMER_609, priority: "CRITICAL", status: "OPEN", source: "PHONE", assignedToId: FINANCE_USER_ID, openedAt: daysAgo(0), dueAt: daysAgo(0) },
  { id: "00000000-0000-4000-8000-000000001129", ticketNumber: "TKT-2026-0022", title: "CRM lead import failed", description: "CSV import fails with validation error on row 45.", categoryId: CATEGORIES[5].id, projectId: PROJECT_CRM, priority: "MEDIUM", status: "IN_PROGRESS", source: "EMAIL", assignedToId: SALES_USER_ID, openedAt: daysAgo(3), dueAt: daysFromNow(1) },
  { id: "00000000-0000-4000-8000-000000001130", ticketNumber: "TKT-2026-0023", title: "Branch KPI report missing data", description: "Irbid branch revenue shows zero for last week.", categoryId: CATEGORIES[0].id, priority: "LOW", status: "CLOSED", source: "INTERNAL", assignedToId: BRANCH_USER_ID, openedAt: daysAgo(12), dueAt: daysAgo(9), resolvedAt: daysAgo(10), closedAt: daysAgo(9) },
  { id: "00000000-0000-4000-8000-000000001131", ticketNumber: "TKT-2026-0024", title: "Goods receipt quantity mismatch", description: "GR-2026-0005 received 80 units but PO shows 100.", categoryId: CATEGORIES[2].id, priority: "HIGH", status: "OPEN", source: "INTERNAL", assignedToId: INVENTORY_USER_ID, openedAt: daysAgo(1), dueAt: daysAgo(0) },
  { id: "00000000-0000-4000-8000-000000001132", ticketNumber: "TKT-2026-0025", title: "Sales order discount not applied", description: "Volume discount missing on SO-2026-0024.", categoryId: CATEGORIES[1].id, customerId: CUSTOMER_606, priority: "MEDIUM", status: "WAITING_CUSTOMER", source: "WHATSAPP", assignedToId: SALES_USER_ID, openedAt: daysAgo(2), dueAt: daysFromNow(3) },
  { id: "00000000-0000-4000-8000-000000001133", ticketNumber: "TKT-2026-0026", title: "ERP data migration validation", description: "Opening balances do not match legacy system.", categoryId: CATEGORIES[5].id, projectId: PROJECT_ERP, priority: "CRITICAL", status: "IN_PROGRESS", source: "INTERNAL", assignedToId: CEO_USER_ID, openedAt: daysAgo(5), dueAt: daysAgo(1) },
  { id: "00000000-0000-4000-8000-000000001134", ticketNumber: "TKT-2026-0027", title: "Notification emails not sending", description: "Low stock alerts not reaching inventory manager.", categoryId: CATEGORIES[0].id, priority: "HIGH", status: "OPEN", source: "INTERNAL", assignedToId: INVENTORY_USER_ID, openedAt: daysAgo(1), dueAt: daysFromNow(2) },
  { id: "00000000-0000-4000-8000-000000001135", ticketNumber: "TKT-2026-0028", title: "Customer pricing tier update", description: "Request to move CUS-014 to wholesale tier.", categoryId: CATEGORIES[7].id, customerId: CUSTOMER_613, priority: "LOW", status: "OPEN", source: "EMAIL", assignedToId: SALES_USER_ID, openedAt: daysAgo(4), dueAt: daysFromNow(10) },
  { id: "00000000-0000-4000-8000-000000001136", ticketNumber: "TKT-2026-0029", title: "Attendance clock-in error", description: "Biometric device not syncing with HR module.", categoryId: CATEGORIES[0].id, priority: "MEDIUM", status: "CANCELLED", source: "INTERNAL", assignedToId: HR_USER_ID, openedAt: daysAgo(15), dueAt: daysAgo(12) },
  { id: "00000000-0000-4000-8000-000000001137", ticketNumber: "TKT-2026-0030", title: "Warehouse label printer offline", description: "Label printer at Amman HQ not responding.", categoryId: CATEGORIES[0].id, projectId: PROJECT_WH, priority: "HIGH", status: "IN_PROGRESS", source: "PHONE", assignedToId: INVENTORY_USER_ID, openedAt: daysAgo(0), dueAt: daysFromNow(1) },
  { id: "00000000-0000-4000-8000-000000001138", ticketNumber: "TKT-2026-0031", title: "Trial balance out of balance", description: "Month-end trial balance off by JOD 120.", categoryId: CATEGORIES[1].id, priority: "CRITICAL", status: "OPEN", source: "INTERNAL", assignedToId: FINANCE_USER_ID, openedAt: daysAgo(0), dueAt: daysAgo(0) },
  { id: "00000000-0000-4000-8000-000000001139", ticketNumber: "TKT-2026-0032", title: "Delivery route optimization request", description: "Customer wants consolidated weekly delivery schedule.", categoryId: CATEGORIES[7].id, customerId: CUSTOMER_601, priority: "LOW", status: "OPEN", source: "EMAIL", assignedToId: BRANCH_USER_ID, openedAt: daysAgo(3), dueAt: daysFromNow(14) },
  { id: "00000000-0000-4000-8000-000000001140", ticketNumber: "TKT-2026-0033", title: "Opportunity stage not updating", description: "CRM opportunity stuck in Proposal stage after win.", categoryId: CATEGORIES[5].id, projectId: PROJECT_CRM, priority: "MEDIUM", status: "RESOLVED", source: "PORTAL", assignedToId: SALES_USER_ID, openedAt: daysAgo(6), dueAt: daysAgo(4), resolvedAt: daysAgo(5) },
  { id: "00000000-0000-4000-8000-000000001141", ticketNumber: "TKT-2026-0034", title: "Internal IT equipment request", description: "Request 2 laptops for new finance hires.", categoryId: CATEGORIES[7].id, priority: "LOW", status: "OPEN", source: "INTERNAL", assignedToId: HR_USER_ID, openedAt: daysAgo(2), dueAt: daysFromNow(7) },
  { id: "00000000-0000-4000-8000-000000001142", ticketNumber: "TKT-2026-0035", title: "Stock reservation not releasing", description: "Cancelled SO still holding stock reservation.", categoryId: CATEGORIES[0].id, priority: "HIGH", status: "IN_PROGRESS", source: "INTERNAL", assignedToId: INVENTORY_USER_ID, openedAt: daysAgo(1), dueAt: daysAgo(0) },
];

const COMMENTS: Array<{
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: Date;
}> = [];

let commentIdx = 0;
const commentBodies = [
  "Acknowledged. Investigating now.",
  "Contacted customer for more details.",
  "Escalated to technical team.",
  "Waiting for customer response.",
  "Issue reproduced in staging environment.",
  "Fix deployed. Please verify.",
  "Internal note: root cause was cache invalidation.",
  "Customer confirmed resolution.",
  "Assigned to specialist for follow-up.",
  "SLA extended per customer request.",
  "Related to known issue TKT-2026-0010.",
  "Documentation updated.",
];

for (const ticket of TICKETS) {
  const numComments = 2 + (commentIdx % 3);
  for (let i = 0; i < numComments; i++) {
    const authorIds = [CEO_USER_ID, ticket.assignedToId ?? SALES_USER_ID, FINANCE_USER_ID, INVENTORY_USER_ID];
    COMMENTS.push({
      id: `00000000-0000-4000-8000-00000000${String(1200 + commentIdx).padStart(4, "0")}`,
      ticketId: ticket.id,
      authorId: authorIds[i % authorIds.length]!,
      body: commentBodies[(commentIdx + i) % commentBodies.length]!,
      isInternal: i === 1 && commentIdx % 2 === 0,
      createdAt: new Date(ticket.openedAt.getTime() + (i + 1) * 3600000),
    });
    commentIdx++;
    if (commentIdx >= 80) break;
  }
  if (commentIdx >= 80) break;
}

export async function seedSupport(prisma: PrismaClient) {
  await prisma.supportTicketComment.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.supportTicket.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.supportCategory.deleteMany({ where: { organizationId: ORG_ID } });

  for (const cat of CATEGORIES) {
    await prisma.supportCategory.upsert({
      where: { id: cat.id },
      create: {
        id: cat.id,
        organizationId: ORG_ID,
        code: cat.code,
        name: cat.name,
        description: cat.description,
        isActive: true,
      },
      update: {
        code: cat.code,
        name: cat.name,
        description: cat.description,
        isActive: true,
      },
    });
  }

  for (const ticket of TICKETS) {
    await prisma.supportTicket.upsert({
      where: { id: ticket.id },
      create: {
        id: ticket.id,
        organizationId: ORG_ID,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: ticket.description,
        categoryId: ticket.categoryId,
        customerId: ticket.customerId ?? null,
        projectId: ticket.projectId ?? null,
        priority: ticket.priority,
        status: ticket.status,
        source: ticket.source,
        assignedToId: ticket.assignedToId ?? null,
        openedAt: ticket.openedAt,
        dueAt: ticket.dueAt ?? null,
        resolvedAt: ticket.resolvedAt ?? null,
        closedAt: ticket.closedAt ?? null,
      },
      update: {
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
      },
    });
  }

  for (const comment of COMMENTS) {
    await prisma.supportTicketComment.upsert({
      where: { id: comment.id },
      create: {
        id: comment.id,
        organizationId: ORG_ID,
        ticketId: comment.ticketId,
        authorId: comment.authorId,
        body: comment.body,
        isInternal: comment.isInternal,
        createdAt: comment.createdAt,
      },
      update: {
        body: comment.body,
        isInternal: comment.isInternal,
      },
    });
  }

  return { categories: CATEGORIES.length, tickets: TICKETS.length, comments: COMMENTS.length };
}

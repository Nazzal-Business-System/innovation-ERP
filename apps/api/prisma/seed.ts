import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedInventory } from "./seed-inventory.js";
import { seedProcurement } from "./seed-procurement.js";
import { seedSales } from "./seed-sales.js";
import { seedAccounting } from "./seed-accounting.js";
import { seedHr } from "./seed-hr.js";
import { seedHrExpansion } from "./seed-hr-expansion.js";
import { seedSettings } from "./seed-settings.js";
import { seedNotifications } from "./seed-notifications.js";
import { seedOperations } from "./seed-operations.js";
import { seedFinance } from "./seed-finance.js";
import { seedInventoryExpansion } from "./seed-inventory-expansion.js";
import { seedCrm } from "./seed-crm.js";
import { seedProjects } from "./seed-projects.js";
import { seedSupport } from "./seed-support.js";
import { seedDocuments } from "./seed-documents.js";
import { seedKnowledge } from "./seed-knowledge.js";
import { seedEmployeeLogins } from "./seed-employee-logins.js";

/**
 * Seeds rewrite demo organization data. Never run against production unless
 * ALLOW_PRODUCTION_SEED=true is set explicitly (emergency / intentional only).
 */
if (
  process.env.NODE_ENV === "production" &&
  process.env.ALLOW_PRODUCTION_SEED !== "true"
) {
  console.error(
    "[seed] Refusing to run in production. Set ALLOW_PRODUCTION_SEED=true only if you intentionally want to reseed."
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo123";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const ORG_SLUG = "al-noor-trading";

/** Remove finance/operations rows that reference POs/SOs before procurement/sales re-seed. */
async function cleanupFinanceAndOperations(prisma: PrismaClient) {
  await prisma.customerPayment.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.vendorPayment.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.customerInvoiceLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.vendorBillLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.customerInvoice.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.vendorBill.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.goodsReceiptLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.goodsReceipt.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.deliveryLine.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.delivery.deleteMany({ where: { organizationId: ORG_ID } });
}

/** Navigation / module sections — permission foundation only */
const PERMISSION_CATALOG: Array<{ section: string; action: string; description: string }> = [
  { section: "executive", action: "read", description: "Executive dashboard" },
  { section: "executive", action: "write", description: "Executive settings" },
  { section: "accounting", action: "read", description: "View accounting" },
  { section: "accounting", action: "write", description: "Manage accounting" },
  { section: "inventory", action: "read", description: "View inventory" },
  { section: "inventory", action: "write", description: "Manage inventory" },
  { section: "procurement", action: "read", description: "View procurement" },
  { section: "procurement", action: "write", description: "Manage procurement" },
  { section: "sales", action: "read", description: "View sales" },
  { section: "sales", action: "write", description: "Manage sales" },
  { section: "crm", action: "read", description: "View CRM" },
  { section: "crm", action: "write", description: "Manage CRM" },
  { section: "projects", action: "read", description: "View projects" },
  { section: "projects", action: "write", description: "Manage projects" },
  { section: "support", action: "read", description: "View support tickets" },
  { section: "support", action: "write", description: "Manage support tickets" },
  { section: "documents", action: "read", description: "View documents" },
  { section: "documents", action: "write", description: "Manage documents" },
  { section: "knowledge", action: "read", description: "View knowledge base" },
  { section: "knowledge", action: "write", description: "Manage knowledge base" },
  { section: "hr", action: "read", description: "View HR" },
  { section: "hr", action: "write", description: "Manage HR" },
  { section: "hr_self", action: "read", description: "View own HR self-service records" },
  { section: "hr_self", action: "write", description: "Manage own HR self-service records" },
  { section: "reports", action: "read", description: "View reports" },
  { section: "reports", action: "write", description: "Manage reports" },
  { section: "settings", action: "read", description: "View settings" },
  { section: "settings", action: "write", description: "Manage settings" },
  { section: "users", action: "read", description: "View users" },
  { section: "users", action: "write", description: "Manage users" },
  { section: "roles", action: "read", description: "View roles and permissions" },
  { section: "roles", action: "write", description: "Manage roles and permissions" },
  { section: "audit_log", action: "read", description: "View audit log" },
  { section: "notifications", action: "read", description: "View notifications" },
  { section: "operations", action: "read", description: "View operations workflows" },
  { section: "operations", action: "write", description: "Manage operations workflows" },
  { section: "finance", action: "read", description: "View finance documents" },
  { section: "finance", action: "write", description: "Manage finance documents" },
];

type RoleSeed = {
  id: string;
  code: string;
  name: string;
  description: string;
  grants: Array<{ section: string; action: string }>;
};

const ROLES: RoleSeed[] = [
  {
    id: "00000000-0000-4000-8000-000000000010",
    code: "owner",
    name: "CEO / Owner",
    description: "Full organization access",
    grants: PERMISSION_CATALOG.map((p) => ({ section: p.section, action: p.action })),
  },
  {
    id: "00000000-0000-4000-8000-000000000011",
    code: "finance_manager",
    name: "Finance Manager",
    description: "Accounting and financial reports",
    grants: [
      { section: "executive", action: "read" },
      { section: "accounting", action: "read" },
      { section: "accounting", action: "write" },
      { section: "finance", action: "read" },
      { section: "finance", action: "write" },
      { section: "documents", action: "read" },
      { section: "documents", action: "write" },
      { section: "reports", action: "read" },
      { section: "settings", action: "read" },
      { section: "notifications", action: "read" },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000012",
    code: "inventory_manager",
    name: "Inventory Manager",
    description: "Inventory and warehouses",
    grants: [
      { section: "executive", action: "read" },
      { section: "inventory", action: "read" },
      { section: "inventory", action: "write" },
      { section: "procurement", action: "read" },
      { section: "procurement", action: "write" },
      { section: "operations", action: "read" },
      { section: "operations", action: "write" },
      { section: "reports", action: "read" },
      { section: "notifications", action: "read" },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000013",
    code: "sales_manager",
    name: "Sales Manager",
    description: "Sales operations",
    grants: [
      { section: "executive", action: "read" },
      { section: "sales", action: "read" },
      { section: "sales", action: "write" },
      { section: "crm", action: "read" },
      { section: "crm", action: "write" },
      { section: "projects", action: "read" },
      { section: "projects", action: "write" },
      { section: "support", action: "read" },
      { section: "support", action: "write" },
      { section: "documents", action: "read" },
      { section: "documents", action: "write" },
      { section: "operations", action: "read" },
      { section: "operations", action: "write" },
      { section: "reports", action: "read" },
      { section: "notifications", action: "read" },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000014",
    code: "hr_manager",
    name: "HR Manager",
    description: "Human resources",
    grants: [
      { section: "executive", action: "read" },
      { section: "hr", action: "read" },
      { section: "hr", action: "write" },
      { section: "documents", action: "read" },
      { section: "documents", action: "write" },
      { section: "settings", action: "read" },
      { section: "notifications", action: "read" },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000015",
    code: "branch_manager",
    name: "Branch Manager",
    description: "Branch operations overview",
    grants: [
      { section: "executive", action: "read" },
      { section: "inventory", action: "read" },
      { section: "sales", action: "read" },
      { section: "crm", action: "read" },
      { section: "projects", action: "read" },
      { section: "support", action: "read" },
      { section: "documents", action: "read" },
      { section: "procurement", action: "read" },
      { section: "operations", action: "read" },
      { section: "reports", action: "read" },
      { section: "notifications", action: "read" },
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000016",
    code: "employee",
    name: "Employee",
    description: "Employee self-service (own records only)",
    grants: [
      { section: "hr_self", action: "read" },
      { section: "hr_self", action: "write" },
      { section: "notifications", action: "read" },
    ],
  },
];

const USERS = [
  {
    id: "00000000-0000-4000-8000-000000000020",
    email: "ceo@nazzal.demo",
    name: "CEO",
    roleId: ROLES[0].id,
  },
  {
    id: "00000000-0000-4000-8000-000000000021",
    email: "finance@nazzal.demo",
    name: "Finance Manager",
    roleId: ROLES[1].id,
  },
  {
    id: "00000000-0000-4000-8000-000000000022",
    email: "inventory@nazzal.demo",
    name: "Inventory Manager",
    roleId: ROLES[2].id,
  },
  {
    id: "00000000-0000-4000-8000-000000000023",
    email: "sales@nazzal.demo",
    name: "Sales Manager",
    roleId: ROLES[3].id,
  },
  {
    id: "00000000-0000-4000-8000-000000000024",
    email: "hr@nazzal.demo",
    name: "HR Manager",
    roleId: ROLES[4].id,
  },
  {
    id: "00000000-0000-4000-8000-000000000025",
    email: "branch@nazzal.demo",
    name: "Branch Manager",
    roleId: ROLES[5].id,
  },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const organization = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { name: "Al-Noor Trading Company", slug: ORG_SLUG, isActive: true },
    create: {
      id: ORG_ID,
      name: "Al-Noor Trading Company",
      slug: ORG_SLUG,
      isActive: true,
    },
  });

  const permissionRecords = new Map<string, string>();

  for (const perm of PERMISSION_CATALOG) {
    const record = await prisma.permission.upsert({
      where: { section_action: { section: perm.section, action: perm.action } },
      update: { description: perm.description },
      create: {
        section: perm.section,
        action: perm.action,
        description: perm.description,
      },
    });
    permissionRecords.set(`${perm.section}.${perm.action}`, record.id);
  }

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: role.code } },
      update: { name: role.name, description: role.description, isSystem: true },
      create: {
        id: role.id,
        organizationId: organization.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: true,
      },
    });

    for (const grant of role.grants) {
      const permissionId = permissionRecords.get(`${grant.section}.${grant.action}`);
      if (!permissionId) continue;

      const roleRecord = await prisma.role.findUniqueOrThrow({
        where: { organizationId_code: { organizationId: organization.id, code: role.code } },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: roleRecord.id, permissionId },
        },
        update: { granted: true },
        create: {
          roleId: roleRecord.id,
          permissionId,
          granted: true,
        },
      });
    }
  }

  for (const user of USERS) {
    await prisma.user.upsert({
      where: {
        organizationId_email: { organizationId: organization.id, email: user.email },
      },
      update: {
        name: user.name,
        passwordHash,
        isActive: true,
      },
      create: {
        id: user.id,
        organizationId: organization.id,
        email: user.email,
        name: user.name,
        passwordHash,
        isActive: true,
      },
    });

    const dbUser = await prisma.user.findUniqueOrThrow({
      where: {
        organizationId_email: { organizationId: organization.id, email: user.email },
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: dbUser.id, roleId: user.roleId } },
      update: {},
      create: { userId: dbUser.id, roleId: user.roleId },
    });
  }

  await seedInventory(prisma);
  await cleanupFinanceAndOperations(prisma);
  await seedProcurement(prisma);
  await seedSales(prisma);
  await seedAccounting(prisma);
  const hrStats = await seedHr(prisma);
  const employeeLoginStats = await seedEmployeeLogins(prisma, passwordHash);
  const hrExpansionStats = await seedHrExpansion(prisma);
  const settingsStats = await seedSettings(prisma);
  const operationsStats = await seedOperations(prisma);
  const financeStats = await seedFinance(prisma);
  const inventoryExpansionStats = await seedInventoryExpansion(prisma);
  const crmStats = await seedCrm(prisma);
  const projectsStats = await seedProjects(prisma);
  const supportStats = await seedSupport(prisma);
  const documentsStats = await seedDocuments(prisma);
  const knowledgeStats = await seedKnowledge(prisma);
  const notificationStats = await seedNotifications(prisma);

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      action: "seed.completed",
      entity: "Organization",
      entityId: organization.id,
      details: { message: "Demo organization and users seeded" },
    },
  });

  console.log("Seed complete:");
  console.log(`  Organization: ${organization.name}`);
  console.log(`  Users: ${USERS.length} (password: ${DEMO_PASSWORD})`);
  console.log(`  Roles: ${ROLES.length}`);
  console.log(`  Permissions: ${PERMISSION_CATALOG.length}`);
  console.log("  Inventory module seeded (warehouses, products, stock, movements)");
  console.log("  Procurement module seeded (vendors, purchase orders, lines)");
  console.log("  Sales module seeded (customers, sales orders, lines)");
  console.log("  Accounting module seeded (accounts, journal entries, lines)");
  console.log(
    `  HR module seeded (${hrStats.departments} departments, ${hrStats.employees} employees, ${hrStats.attendance} attendance, ${hrStats.leaveRequests} leave requests)`
  );
  console.log(
    `  Employee self-service logins linked: ${employeeLoginStats.linked}/${employeeLoginStats.total} (password: ${DEMO_PASSWORD})`
  );
  console.log(
    `  HR expansion seeded (${hrExpansionStats.payrollRuns} payroll runs, ${hrExpansionStats.payrollLines} payroll lines, ${hrExpansionStats.contracts} contracts, ${hrExpansionStats.documents} documents)`
  );
  console.log(
    `  Settings module seeded (${settingsStats.branches} branches, ${settingsStats.preferences} preferences, ${settingsStats.auditLogs} audit log entries)`
  );
  console.log(
    `  Operations module seeded (${operationsStats.goodsReceipts} goods receipts, ${operationsStats.deliveries} deliveries)`
  );
  console.log(
    `  Finance module seeded (${financeStats.invoices} invoices, ${financeStats.bills} bills, ${financeStats.customerPayments} customer payments, ${financeStats.vendorPayments} vendor payments)`
  );
  console.log(
    `  Inventory expansion seeded (${inventoryExpansionStats.reservations} reservations, ${inventoryExpansionStats.transfers} transfers)`
  );
  console.log(
    `  CRM module seeded (${crmStats.leads} leads, ${crmStats.opportunities} opportunities, ${crmStats.activities} activities)`
  );
  console.log(
    `  Projects module seeded (${projectsStats.projects} projects, ${projectsStats.tasks} tasks, ${projectsStats.milestones} milestones)`
  );
  console.log(
    `  Support module seeded (${supportStats.categories} categories, ${supportStats.tickets} tickets, ${supportStats.comments} comments)`
  );
  console.log(
    `  Documents module seeded (${documentsStats.categories} categories, ${documentsStats.files} files, ${documentsStats.links} links)`
  );
  console.log(
    `  Knowledge module seeded (${knowledgeStats.categories} categories, ${knowledgeStats.articles} articles, ${knowledgeStats.ticketLinks} ticket links, ${knowledgeStats.documentLinks} document links)`
  );
  console.log(`  Notifications module seeded (${notificationStats.notifications} notifications)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

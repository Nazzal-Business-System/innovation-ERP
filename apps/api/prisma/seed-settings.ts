import type { PrismaClient } from "@prisma/client";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CEO_USER_ID = "00000000-0000-4000-8000-000000000020";
const FINANCE_USER_ID = "00000000-0000-4000-8000-000000000021";
const SALES_USER_ID = "00000000-0000-4000-8000-000000000023";

const BRANCHES = [
  {
    id: "00000000-0000-4000-8000-000000000701",
    code: "AMM-HQ",
    name: "Amman HQ",
    city: "Amman",
    address: "King Hussein Street, Building 12, Amman 11118",
    phone: "+962 6 555 0100",
  },
  {
    id: "00000000-0000-4000-8000-000000000702",
    code: "IRB-BR",
    name: "Irbid Branch",
    city: "Irbid",
    address: "University Street, Industrial Zone, Irbid 21110",
    phone: "+962 2 555 0200",
  },
] as const;

const PREFERENCES = [
  { key: "defaultCurrency", value: "JOD", category: "general" },
  { key: "language", value: "en", category: "localization" },
  { key: "timezone", value: "Asia/Amman", category: "localization" },
  { key: "fiscalYearStart", value: "01-01", category: "general" },
  { key: "dateFormat", value: "DD/MM/YYYY", category: "localization" },
] as const;

export async function seedSettings(prisma: PrismaClient) {
  await prisma.organization.update({
    where: { id: ORG_ID },
    data: {
      industry: "Wholesale & Distribution",
      contactEmail: "info@al-noor-trading.demo",
      contactPhone: "+962 6 555 0100",
    },
  });

  for (const branch of BRANCHES) {
    await prisma.branch.upsert({
      where: { organizationId_code: { organizationId: ORG_ID, code: branch.code } },
      update: {
        name: branch.name,
        city: branch.city,
        address: branch.address,
        phone: branch.phone,
        isActive: true,
      },
      create: {
        id: branch.id,
        organizationId: ORG_ID,
        code: branch.code,
        name: branch.name,
        city: branch.city,
        address: branch.address,
        phone: branch.phone,
        isActive: true,
      },
    });
  }

  for (const pref of PREFERENCES) {
    await prisma.systemPreference.upsert({
      where: { organizationId_key: { organizationId: ORG_ID, key: pref.key } },
      update: { value: pref.value, category: pref.category },
      create: {
        organizationId: ORG_ID,
        key: pref.key,
        value: pref.value,
        category: pref.category,
      },
    });
  }

  const auditEntries = [
    {
      userId: CEO_USER_ID,
      action: "auth.login",
      entity: "User",
      entityId: CEO_USER_ID,
      details: { message: "User logged in" },
      offsetMinutes: 5,
    },
    {
      userId: FINANCE_USER_ID,
      action: "procurement.purchase_order.approved",
      entity: "PurchaseOrder",
      entityId: "00000000-0000-4000-8000-000000000301",
      details: { poNumber: "PO-2024-014", vendor: "Jordan Supplies Co." },
      offsetMinutes: 45,
    },
    {
      userId: SALES_USER_ID,
      action: "sales.order.confirmed",
      entity: "SalesOrder",
      entityId: "00000000-0000-4000-8000-000000000401",
      details: { orderNumber: "SO-2024-088", customer: "Al-Madina Retail" },
      offsetMinutes: 120,
    },
    {
      userId: FINANCE_USER_ID,
      action: "accounting.journal_entry.posted",
      entity: "JournalEntry",
      entityId: "00000000-0000-4000-8000-000000000501",
      details: { entryNumber: "JE-2024-037", description: "Monthly revenue recognition" },
      offsetMinutes: 180,
    },
    {
      userId: CEO_USER_ID,
      action: "hr.leave.approved",
      entity: "LeaveRequest",
      entityId: "00000000-0000-4000-8000-000000000601",
      details: { employee: "Sara Al-Khatib", type: "ANNUAL", days: 3 },
      offsetMinutes: 240,
    },
    {
      userId: CEO_USER_ID,
      action: "reports.generated",
      entity: "Report",
      entityId: null,
      details: { report: "sales-summary", period: "2024-Q4" },
      offsetMinutes: 300,
    },
  ] as const;

  const now = Date.now();
  for (const entry of auditEntries) {
    const createdAt = new Date(now - entry.offsetMinutes * 60 * 1000);
    const existing = await prisma.auditLog.findFirst({
      where: {
        organizationId: ORG_ID,
        action: entry.action,
        entity: entry.entity,
      },
    });
    if (!existing) {
      await prisma.auditLog.create({
        data: {
          organizationId: ORG_ID,
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          details: entry.details,
          createdAt,
        },
      });
    }
  }

  return {
    branches: BRANCHES.length,
    preferences: PREFERENCES.length,
    auditLogs: auditEntries.length,
  };
}

/**
 * Organization-scoped seed coverage report (counts only — no row contents).
 *
 *   npx tsx scripts/verify-seed-coverage.ts
 *
 * Optional: ORGANIZATION_ID / ORGANIZATION_SLUG
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001";

type Check = {
  key: string;
  actual: number;
  minimum: number;
};

function row(check: Check): string {
  const status = check.actual >= check.minimum ? "PASS" : "MISSING";
  return `${status.padEnd(8)} ${check.key.padEnd(28)} actual=${String(check.actual).padStart(4)} min=${String(check.minimum).padStart(3)}`;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    let orgId = process.env.ORGANIZATION_ID?.trim();
    const slug = process.env.ORGANIZATION_SLUG?.trim();
    if (!orgId && slug) {
      const org = await prisma.organization.findFirst({ where: { slug } });
      if (!org) throw new Error(`Organization not found: ${slug}`);
      orgId = org.id;
    }
    if (!orgId) {
      const demo = await prisma.organization.findFirst({ where: { id: DEMO_ORG_ID } });
      orgId = demo?.id ?? (await prisma.organization.findFirst())?.id;
    }
    if (!orgId) throw new Error("No organization found");

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    console.log(`Organization: ${org.name} (${org.slug}) ${org.id}`);
    console.log("---");

    const o = { organizationId: orgId };
    const checks: Check[] = [
      { key: "users", actual: await prisma.user.count({ where: o }), minimum: 1 },
      { key: "roles", actual: await prisma.role.count({ where: o }), minimum: 1 },
      { key: "branches", actual: await prisma.branch.count({ where: o }), minimum: 0 },
      { key: "employees", actual: await prisma.employee.count({ where: o }), minimum: 1 },
      { key: "departments", actual: await prisma.department.count({ where: o }), minimum: 0 },
      { key: "products", actual: await prisma.product.count({ where: o }), minimum: 0 },
      { key: "warehouses", actual: await prisma.warehouse.count({ where: o }), minimum: 0 },
      { key: "customers", actual: await prisma.customer.count({ where: o }), minimum: 0 },
      { key: "vendors", actual: await prisma.vendor.count({ where: o }), minimum: 0 },
      { key: "sales_orders", actual: await prisma.salesOrder.count({ where: o }), minimum: 0 },
      { key: "purchase_orders", actual: await prisma.purchaseOrder.count({ where: o }), minimum: 0 },
      { key: "accounts", actual: await prisma.account.count({ where: o }), minimum: 0 },
      { key: "journal_entries", actual: await prisma.journalEntry.count({ where: o }), minimum: 0 },
      {
        key: "knowledge_categories",
        actual: await prisma.knowledgeCategory.count({ where: o }),
        minimum: 8,
      },
      {
        key: "knowledge_articles",
        actual: await prisma.knowledgeArticle.count({ where: o }),
        minimum: 20,
      },
      {
        key: "knowledge_articles_published",
        actual: await prisma.knowledgeArticle.count({
          where: { ...o, status: "PUBLISHED" },
        }),
        minimum: 10,
      },
      {
        key: "knowledge_tags",
        actual: await prisma.knowledgeArticleTag.count({ where: o }),
        minimum: 1,
      },
      { key: "notifications", actual: await prisma.notification.count({ where: o }), minimum: 0 },
    ];

    for (const c of checks) console.log(row(c));

    const missing = checks.filter((c) => c.actual < c.minimum);
    console.log("---");
    if (missing.length === 0) {
      console.log("RESULT: ALL CHECKS PASSED");
    } else {
      console.log(`RESULT: ${missing.length} MISSING — ${missing.map((m) => m.key).join(", ")}`);
      process.exitCode = 2;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[verify-seed-coverage] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

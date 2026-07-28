/**
 * One-time / safe idempotent knowledge backfill for production Neon.
 *
 * Usage (from innovation-ERP/apps/api with DATABASE_URL pointing at the target DB):
 *
 *   ALLOW_PRODUCTION_SEED=true npx tsx scripts/backfill-knowledge.ts
 *
 * Optional:
 *   ORGANIZATION_ID=<uuid>
 *   ORGANIZATION_SLUG=al-noor-trading
 *
 * Does not wipe existing data. Safe to rerun.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { backfillKnowledgeIdempotent } from "../prisma/seed-knowledge.js";

const DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001";

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_SEED !== "true"
  ) {
    console.error(
      "[backfill-knowledge] Refusing production without ALLOW_PRODUCTION_SEED=true"
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    let orgId = process.env.ORGANIZATION_ID?.trim();
    const slug = process.env.ORGANIZATION_SLUG?.trim();

    if (!orgId && slug) {
      const org = await prisma.organization.findFirst({ where: { slug } });
      if (!org) {
        throw new Error(`Organization not found for slug: ${slug}`);
      }
      orgId = org.id;
    }

    if (!orgId) {
      const demo = await prisma.organization.findFirst({ where: { id: DEMO_ORG_ID } });
      if (demo) {
        orgId = demo.id;
      } else {
        const first = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
        if (!first) throw new Error("No organization found in database");
        orgId = first.id;
        console.warn(
          `[backfill-knowledge] Using first organization ${first.slug} (${first.id})`
        );
      }
    }

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    console.log(`[backfill-knowledge] Target org: ${org.name} (${org.slug}) ${org.id}`);

    const result = await backfillKnowledgeIdempotent(prisma, orgId);
    console.log("[backfill-knowledge] Result:", JSON.stringify(result, null, 2));
    console.log(
      `[backfill-knowledge] Done. Articles total=${result.totals.articles} published=${result.totals.published}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[backfill-knowledge] Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

/**
 * Dev CLI: print metric diagnostics for an organization.
 * Usage: npm run diag:metrics -- <organizationId>
 * Blocked when NODE_ENV=production.
 */
import { collectMetricDiagnostics } from "../src/lib/metric-diagnostics.ts";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Metric diagnostics are disabled in production.");
    process.exit(1);
  }
  const orgId = process.argv[2];
  if (!orgId) {
    console.error("Usage: npm run diag:metrics -- <organizationId>");
    process.exit(1);
  }
  const report = await collectMetricDiagnostics(orgId);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

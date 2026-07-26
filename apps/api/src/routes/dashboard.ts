import { Router } from "express";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { getExecutiveDashboard } from "../lib/executive-dashboard.js";
import { collectMetricDiagnostics } from "../lib/metric-diagnostics.js";
import { diagnosePostedRevenue } from "../lib/revenue-diagnostics.js";

const router = Router();

router.use(requireJwtConfigured);
router.use(authenticate);

router.get(
  "/executive",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const organizationId = req.user!.organizationId;
    const data = await getExecutiveDashboard(organizationId);
    res.json({
      ...data,
      organizationId,
    });
  })
);

/** Dev-only metric diagnostics — blocked in production. */
router.get(
  "/metric-diagnostics",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (process.env.NODE_ENV === "production") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const organizationId = req.user!.organizationId;
    const diagnostics = await collectMetricDiagnostics(organizationId);
    res.json(diagnostics);
  })
);

/** Dev-only posted revenue deep-dive — blocked in production. */
router.get(
  "/revenue-diagnostics",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (process.env.NODE_ENV === "production") {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const organizationId = req.user!.organizationId;
    const diagnostics = await diagnosePostedRevenue(organizationId);
    res.json(diagnostics);
  })
);

export default router;

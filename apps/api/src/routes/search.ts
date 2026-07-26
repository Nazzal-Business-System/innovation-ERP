import { Router } from "express";
import { runGlobalSearch } from "../lib/global-search.js";
import { prisma } from "../lib/prisma.js";
import { searchQuerySchema } from "../lib/search-validation.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

router.use(requireJwtConfigured);
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid search query" });
      return;
    }

    const orgId = req.user!.organizationId;
    const permissions = req.authz?.permissions ?? [];
    const { q, limit } = parsed.data;

    const response = await runGlobalSearch({
      prisma,
      organizationId: orgId,
      permissions,
      query: q,
      limit,
    });

    res.json(response);
  })
);

export default router;

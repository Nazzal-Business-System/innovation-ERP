import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { serializeOrganization } from "../lib/serialize.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

router.use(requireJwtConfigured);
router.use(authenticate);

router.get(
  "/current",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const organization = await prisma.organization.findUnique({
      where: { id: req.user!.organizationId },
    });

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    res.json({ organization: serializeOrganization(organization) });
  })
);

export default router;

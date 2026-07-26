import { Router } from "express";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

router.use(requireJwtConfigured);
router.use(authenticate);

router.get(
  "/demo",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    res.json({
      message: "Protected route OK",
      userId: req.user!.userId,
      organizationId: req.user!.organizationId,
      email: req.user!.email,
      roleCode: req.user!.roleCode,
    });
  })
);

export default router;

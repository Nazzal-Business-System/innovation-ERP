import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.js";

export function requirePermission(...permissionKeys: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.authz) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const permissions = req.authz.permissions;
    const allowed = permissionKeys.some((key) => permissions.includes(key));

    if (!allowed) {
      res.status(403).json({
        error: "You do not have permission to access this resource",
        code: "FORBIDDEN",
      });
      return;
    }

    next();
  };
}

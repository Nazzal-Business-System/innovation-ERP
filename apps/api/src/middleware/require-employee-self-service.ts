import type { Response, NextFunction } from "express";
import { isEmployeeSelfServiceUser } from "@ierp/shared";
import type { AuthenticatedRequest } from "./auth.js";

/**
 * Employee self-service API is restricted to regular employees
 * (`isEmployeeSelfServiceUser`). Managers/CEO with hr_self grants are denied.
 */
export function requireEmployeeSelfService() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.authz) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!isEmployeeSelfServiceUser(req.authz.permissions)) {
      res.status(403).json({
        error: "Employee self-service is only available to regular employee accounts",
        code: "SELF_SERVICE_EMPLOYEE_ONLY",
      });
      return;
    }

    next();
  };
}

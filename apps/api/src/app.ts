import { Router } from "express";
import cors from "cors";
import { getCorsOrigin } from "./lib/env.js";
import { healthRouter } from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import organizationRoutes from "./routes/organizations.js";
import protectedRoutes from "./routes/protected.js";
import dashboardRoutes from "./routes/dashboard.js";
import inventoryRoutes from "./routes/inventory.js";
import procurementRoutes from "./routes/procurement.js";
import salesRoutes from "./routes/sales.js";
import accountingRoutes from "./routes/accounting.js";
import reportsRoutes from "./routes/reports.js";
import hrRoutes from "./routes/hr.js";
import hrSelfServiceRoutes from "./routes/hr-self-service.js";
import settingsRoutes from "./routes/settings.js";
import notificationsRoutes from "./routes/notifications.js";
import operationsRoutes from "./routes/operations.js";
import financeRoutes from "./routes/finance.js";
import crmRoutes from "./routes/crm.js";
import projectsRoutes from "./routes/projects.js";
import supportRoutes from "./routes/support.js";
import documentsRoutes from "./routes/documents.js";
import knowledgeRoutes from "./routes/knowledge.js";
import searchRoutes from "./routes/search.js";
import { errorHandler } from "./middleware/error-handler.js";

export function createApp() {
  const router = Router();

  router.use(
    cors({
      origin: getCorsOrigin(),
      credentials: true,
    })
  );

  router.use("/health", healthRouter);
  router.use("/auth", authRoutes);
  router.use("/organizations", organizationRoutes);
  router.use("/protected", protectedRoutes);
  router.use("/dashboard", dashboardRoutes);
  router.use("/inventory", inventoryRoutes);
  router.use("/procurement", procurementRoutes);
  router.use("/sales", salesRoutes);
  router.use("/accounting", accountingRoutes);
  router.use("/reports", reportsRoutes);
  router.use("/hr", hrRoutes);
  router.use("/self-service", hrSelfServiceRoutes);
  router.use("/settings", settingsRoutes);
  router.use("/notifications", notificationsRoutes);
  router.use("/operations", operationsRoutes);
  router.use("/finance", financeRoutes);
  router.use("/crm", crmRoutes);
  router.use("/projects", projectsRoutes);
  router.use("/support", supportRoutes);
  router.use("/documents", documentsRoutes);
  router.use("/knowledge", knowledgeRoutes);
  router.use("/search", searchRoutes);

  router.use(errorHandler);

  return router;
}

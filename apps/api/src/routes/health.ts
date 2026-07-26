import { Router } from "express";
import { API_SERVICE_NAME, API_VERSION, type ApiHealthResponse } from "@ierp/shared";
import { checkDatabaseConnection } from "../lib/prisma.js";
import { asyncHandler } from "../middleware/error-handler.js";

export const healthRouter = Router();

healthRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    let database: ApiHealthResponse["database"] = "not_configured";

    if (process.env.DATABASE_URL?.trim()) {
      const connected = await checkDatabaseConnection();
      database = connected ? "connected" : "disconnected";
    }

    const status: ApiHealthResponse["status"] =
      database === "disconnected" ? "degraded" : "ok";

    const body: ApiHealthResponse = {
      status,
      service: API_SERVICE_NAME,
      version: API_VERSION,
      timestamp: new Date().toISOString(),
      database,
    };

    res.status(status === "ok" ? 200 : 503).json(body);
  })
);

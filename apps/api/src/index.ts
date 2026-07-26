import "dotenv/config";
import express from "express";
import { API_SERVICE_NAME } from "@ierp/shared";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { getPort, validateEnv } from "./lib/env.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = express();
const port = getPort();

app.use(express.json({ limit: "3mb" }));

/** Lightweight liveness probe — no DB hit (Render / load balancers). */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: API_SERVICE_NAME });
});

app.use("/api", createApp());

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

async function start() {
  validateEnv();

  // Bind all interfaces for container platforms (Render, Docker).
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Innovation ERP API listening on 0.0.0.0:${port}`);
  });

  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[ierp-api] ${signal} received — shutting down`);

    const forceTimer = setTimeout(() => {
      console.error("[ierp-api] Forced exit after shutdown timeout");
      process.exit(1);
    }, 15_000);
    forceTimer.unref();

    server.close(async () => {
      try {
        await prisma.$disconnect();
      } catch (err) {
        console.error("[ierp-api] Prisma disconnect error:", err);
      }
      clearTimeout(forceTimer);
      process.exit(0);
    });
  }

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((err) => {
  console.error("[ierp-api] Startup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

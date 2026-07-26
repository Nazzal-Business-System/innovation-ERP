import { DEFAULT_API_PORT } from "@ierp/shared";

const isProd = process.env.NODE_ENV === "production";

function logStartup(message: string) {
  console.log(`[ierp-api] ${message}`);
}

export function getPort(): number {
  return parseInt(process.env.PORT ?? String(DEFAULT_API_PORT), 10);
}

export function getCorsOrigin(): string {
  const origin = process.env.CORS_ORIGIN?.trim();
  if (origin) return origin;
  if (isProd) {
    throw new Error(
      "CORS_ORIGIN is required in production (e.g. https://your-app.vercel.app)"
    );
  }
  return "http://localhost:3010";
}

/**
 * Fail fast on missing production secrets; log helpful config in all environments.
 * JWT_SECRET is also asserted when signing/verifying tokens.
 */
export function validateEnv(): void {
  const missing: string[] = [];

  if (!process.env.DATABASE_URL?.trim()) {
    missing.push("DATABASE_URL");
  }
  if (!process.env.JWT_SECRET?.trim()) {
    missing.push("JWT_SECRET");
  }
  if (isProd && !process.env.CORS_ORIGIN?.trim()) {
    missing.push("CORS_ORIGIN");
  }

  if (missing.length > 0) {
    const msg = `Missing required environment variable(s): ${missing.join(", ")}`;
    if (isProd) {
      throw new Error(msg);
    }
    console.warn(`[ierp-api] ${msg}`);
  }

  logStartup(`Port ${getPort()}, CORS origin ${getCorsOrigin()}`);
  if (!isProd && !process.env.DATABASE_URL?.trim()) {
    logStartup("DATABASE_URL not set — API health will report database as not_configured");
  }
}

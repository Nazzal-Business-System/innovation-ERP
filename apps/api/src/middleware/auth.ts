import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { assertJwtSecret, JwtConfigError, type JwtPayload } from "../lib/jwt.js";
import {
  getAuthVersion,
  getCachedAuthz,
  loadAuthzSnapshot,
  type AuthzSnapshot,
} from "../lib/authz-cache.js";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  /** Server-authoritative authz snapshot for this request (never from the client). */
  authz?: AuthzSnapshot;
  /** Whether authz came from memory cache (for diagnostics). */
  authzSource?: "cache" | "db";
}

export function requireJwtConfigured(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  if (!process.env.JWT_SECRET?.trim()) {
    res.status(503).json({
      error: "Authentication is not configured. Set JWT_SECRET in apps/api/.env and restart the API.",
      code: "JWT_SECRET_MISSING",
    });
    return;
  }
  next();
}

/**
 * JWT-first authentication.
 * Hot path: verify signature/claims + memory authz cache — no database.
 * Cold/stale path: load user/org/permissions once and cache.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!process.env.JWT_SECRET?.trim()) {
    res.status(503).json({
      error: "Authentication is not configured. Set JWT_SECRET in apps/api/.env and restart the API.",
      code: "JWT_SECRET_MISSING",
    });
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const raw = jwt.verify(header.slice(7), assertJwtSecret()) as JwtPayload & { type?: string };
    if (raw.type === "portal" || raw.type === "vendor_portal") {
      res.status(401).json({ error: "ERP authentication required" });
      return;
    }
    if (!raw.userId || !raw.organizationId) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const authVersion = typeof raw.av === "number" && raw.av > 0 ? raw.av : 1;
    const currentVersion = getAuthVersion(raw.userId);
    if (authVersion < currentVersion) {
      res.status(401).json({ error: "Session revoked. Please sign in again.", code: "AUTH_VERSION_STALE" });
      return;
    }

    let snapshot = getCachedAuthz(raw.userId, authVersion);
    let source: "cache" | "db" = "cache";

    if (!snapshot) {
      source = "db";
      snapshot = await loadAuthzSnapshot({
        userId: raw.userId,
        organizationId: raw.organizationId,
        authVersion,
      });
    }

    if (!snapshot) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (!snapshot.isActive) {
      res.status(403).json({ error: "Account is deactivated" });
      return;
    }

    if (!snapshot.orgActive) {
      res.status(403).json({ error: "Organization is inactive" });
      return;
    }

    if (snapshot.organizationId !== raw.organizationId) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = {
      userId: snapshot.userId,
      organizationId: snapshot.organizationId,
      email: snapshot.email,
      roleCode: snapshot.roleCode,
      av: authVersion,
    };
    req.authz = snapshot;
    req.authzSource = source;
    res.setHeader("X-Authz-Source", source);

    next();
  } catch (err) {
    if (err instanceof JwtConfigError) {
      res.status(503).json({ error: err.message, code: "JWT_SECRET_MISSING" });
      return;
    }
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

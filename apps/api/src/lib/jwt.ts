import jwt, { type SignOptions } from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  organizationId: string;
  email: string;
  roleCode: string;
  /** Authorization version — bump server-side to invalidate older tokens after privilege changes. */
  av: number;
}

export class JwtConfigError extends Error {
  constructor(message = "JWT_SECRET is not configured. Set it in apps/api/.env") {
    super(message);
    this.name = "JwtConfigError";
  }
}

export function assertJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new JwtConfigError();
  }
  return secret;
}

export function signToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "8h") as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, assertJwtSecret(), options);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, assertJwtSecret()) as JwtPayload;
}

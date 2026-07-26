import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Always reuse a single PrismaClient per process (dev HMR + production).
globalForPrisma.prisma = prisma;

export async function checkDatabaseConnection(): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) {
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Map operational/inventory workflow failures to user-safe API messages.
 * Logs the original diagnostic privately; never returns Prisma/stack/paths.
 */

export function logTransactionError(context: string, err: unknown): void {
  const detail =
    err instanceof Error
      ? `${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ""}`
      : String(err);
  console.error(`[ierp-api] ${context}`, detail);
}

export function mapTransactionError(
  err: unknown,
  fallback: string
): { status: number; error: string } {
  const raw = err instanceof Error ? err.message : "";
  const lower = raw.toLowerCase();

  if (
    lower.includes("insufficient") ||
    lower.includes("available stock") ||
    lower.includes("stock changed") ||
    lower.includes("not enough")
  ) {
    return {
      status: 400,
      error:
        "Available stock is lower than the requested quantity. Review quantities and try again.",
    };
  }

  if (lower.includes("already received") || lower.includes("no longer in draft")) {
    return {
      status: 400,
      error: "This goods receipt has already been completed.",
    };
  }

  if (lower.includes("already confirmed") || lower.includes("no longer deliverable")) {
    return {
      status: 400,
      error: "This delivery has already been confirmed.",
    };
  }

  if (lower.includes("already") && lower.includes("complet")) {
    return {
      status: 400,
      error: "This transfer has already been completed.",
    };
  }

  if (
    lower.includes("cannot deliver") ||
    (lower.includes("cannot") && lower.includes("deliver"))
  ) {
    return {
      status: 400,
      error:
        "This delivery could not be confirmed because the stock changed. Review the available quantities and try again.",
    };
  }

  if (lower.includes("cannot receive") || lower.includes("cannot receive goods")) {
    return {
      status: 400,
      error: "This goods receipt cannot be received in its current status.",
    };
  }

  if (lower.includes("cannot complete transfer")) {
    return {
      status: 400,
      error: "This transfer cannot be completed in its current status.",
    };
  }

  if (
    lower.includes("source and destination") ||
    lower.includes("warehouses must differ") ||
    lower.includes("same warehouse")
  ) {
    return {
      status: 400,
      error: "Source and destination warehouses must be different.",
    };
  }

  if (lower.includes("warehouse") && (lower.includes("inactive") || lower.includes("not found"))) {
    return {
      status: 400,
      error: "The selected warehouse is inactive or unavailable.",
    };
  }

  if (
    lower.includes("product") &&
    (lower.includes("inactive") ||
      lower.includes("archived") ||
      lower.includes("not found"))
  ) {
    return {
      status: 400,
      error: "One or more products are inactive, archived, or unavailable.",
    };
  }

  if (
    (lower.includes("customer") || lower.includes("vendor")) &&
    (lower.includes("inactive") || lower.includes("archiv"))
  ) {
    return {
      status: 400,
      error: "The selected customer or vendor is inactive or archived.",
    };
  }

  if (lower.includes("at least one line")) {
    return {
      status: 400,
      error: "At least one line item must have a quantity greater than zero.",
    };
  }

  if (lower.includes("transaction") && lower.includes("timeout")) {
    return {
      status: 503,
      error: "The operation took too long. Please try again in a moment.",
    };
  }

  // Prefer known business messages that are already user-safe (no paths/prisma).
  if (
    raw &&
    !raw.includes("\\") &&
    !raw.includes(".ts") &&
    !raw.includes("Prisma") &&
    !raw.includes("at ") &&
    raw.length < 220
  ) {
    return { status: 400, error: raw };
  }

  return { status: 400, error: fallback };
}

import type { DocumentStatus } from "@ierp/shared";

export type DocumentExpiryHealth = "valid" | "expiring_soon" | "expired";

type DocumentExpiryInput = {
  status: DocumentStatus;
  expiryDate?: string | null;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
};

/**
 * Expiry health is separate from lifecycle status (VALID / EXPIRED / MISSING / PENDING_REVIEW).
 * Returns null when expiry is not meaningful (e.g. MISSING documents).
 */
export function getDocumentExpiryHealth(doc: DocumentExpiryInput): DocumentExpiryHealth | null {
  if (doc.status === "MISSING") return null;
  if (doc.status === "EXPIRED" || doc.isExpired) return "expired";
  if (doc.isExpiringSoon) return "expiring_soon";
  return "valid";
}

/**
 * Warning shown beside the expiry date — never duplicates the Status column badge.
 * Status EXPIRED/MISSING already communicate that state via DocumentStatusBadge.
 */
export function getDocumentExpiryWarningLabel(doc: DocumentExpiryInput): string | null {
  if (doc.status === "EXPIRED" || doc.status === "MISSING") return null;
  if (doc.isExpired) return "Expired";
  if (doc.isExpiringSoon) return "Expiring soon";
  return null;
}

export function documentExpiryHealthLabel(health: DocumentExpiryHealth): string {
  switch (health) {
    case "expired":
      return "Expired";
    case "expiring_soon":
      return "Expiring soon";
    case "valid":
    default:
      return "Valid";
  }
}

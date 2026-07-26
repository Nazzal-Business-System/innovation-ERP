import { z } from "zod";
import { isKnownNavGroupId, isKnownNavItemId } from "@ierp/shared";

const sidebarPinSchema = z.object({
  id: z.string().trim().min(1).max(80),
  order: z.number().int().min(0).max(500),
  createdAt: z.string().datetime().optional(),
});

export const updateUiPreferencesSchema = z
  .object({
    sidebarPins: z.array(sidebarPinSchema).max(40).optional(),
    showPinnedSection: z.boolean().optional(),
    sidebarExpandedGroups: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
    notifications: z
      .object({
        inAppEnabled: z.boolean().optional(),
        emailEnabled: z.boolean().optional(),
      })
      .optional(),
  })
  .refine(
    (v) =>
      v.sidebarPins !== undefined ||
      v.showPinnedSection !== undefined ||
      v.sidebarExpandedGroups !== undefined ||
      v.notifications !== undefined,
    {
      message: "At least one preference field is required",
    }
  );

/** Keep only known, unique group IDs (order preserved) for collapsible sidebar state. */
export function normalizeExpandedGroups(groups: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of groups) {
    if (!isKnownNavGroupId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export type UpdateUiPreferencesBody = z.infer<typeof updateUiPreferencesSchema>;

/** Normalize pins: known IDs only, unique, stable order, optional timestamps preserved. */
export function normalizeSidebarPins(
  pins: Array<{ id: string; order: number; createdAt?: string }>
): Array<{ id: string; order: number; createdAt?: string }> {
  const seen = new Set<string>();
  const cleaned: Array<{ id: string; order: number; createdAt?: string }> = [];

  const sorted = [...pins].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  for (const pin of sorted) {
    if (!isKnownNavItemId(pin.id) || seen.has(pin.id)) continue;
    seen.add(pin.id);
    cleaned.push({
      id: pin.id,
      order: cleaned.length,
      ...(pin.createdAt ? { createdAt: pin.createdAt } : {}),
    });
  }
  return cleaned;
}

export function parseStoredUiPreferences(raw: unknown): {
  sidebarPins: Array<{ id: string; order: number; createdAt?: string }>;
  showPinnedSection: boolean;
  sidebarExpandedGroups: string[];
  notifications: { inAppEnabled: boolean; emailEnabled: boolean };
} {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pinsRaw = Array.isArray(obj.sidebarPins) ? obj.sidebarPins : [];
  const pins: Array<{ id: string; order: number; createdAt?: string }> = [];

  for (const entry of pinsRaw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string") continue;
    // Preserve unknown IDs in storage for future restoration; normalize on write only.
    pins.push({
      id: e.id,
      order: typeof e.order === "number" && Number.isFinite(e.order) ? e.order : pins.length,
      ...(typeof e.createdAt === "string" ? { createdAt: e.createdAt } : {}),
    });
  }

  const expandedRaw = Array.isArray(obj.sidebarExpandedGroups) ? obj.sidebarExpandedGroups : [];
  const expandedGroups = normalizeExpandedGroups(
    expandedRaw.filter((g): g is string => typeof g === "string")
  );

  const notif =
    obj.notifications && typeof obj.notifications === "object"
      ? (obj.notifications as Record<string, unknown>)
      : {};

  return {
    sidebarPins: pins,
    showPinnedSection: obj.showPinnedSection === false ? false : true,
    sidebarExpandedGroups: expandedGroups,
    notifications: {
      inAppEnabled: notif.inAppEnabled === false ? false : true,
      emailEnabled: notif.emailEnabled === false ? false : true,
    },
  };
}

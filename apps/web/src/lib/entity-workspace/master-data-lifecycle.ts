import type { MasterDataAuditMeta, MasterDataTimelineEvent } from "@ierp/shared";
import type { Locale } from "@/lib/i18n/types";
import { formatDisplayDateTime } from "@/lib/date";
import type { EntityAuditMeta, EntityTimelineEvent } from "./types";

type Translate = (key: string, fallback?: string) => string;

const ACTION_KEYS: Array<[suffix: string, key: string]> = [
  [".created", "masterData.timeline.created"],
  [".details_updated", "masterData.timeline.detailsUpdated"],
  [".notes_updated", "masterData.timeline.notesUpdated"],
  [".document_attached", "masterData.timeline.documentAttached"],
  [".document_unlinked", "masterData.timeline.documentUnlinked"],
  [".archived", "masterData.timeline.archived"],
  [".restored", "masterData.timeline.restored"],
  [".deactivated", "masterData.timeline.deactivated"],
  [".reactivated", "masterData.timeline.reactivated"],
];

export function mapMasterDataTimeline(
  events: MasterDataTimelineEvent[] | undefined,
  locale: Locale,
  t: Translate
): EntityTimelineEvent[] {
  return (events ?? []).map((event) => {
    const match = ACTION_KEYS.find(([suffix]) => event.action.endsWith(suffix));
    return {
      id: event.id,
      title: match ? t(match[1], event.title) : event.title,
      description: event.description,
      at: formatDisplayDateTime(event.createdAt, locale),
      actor: event.actor,
    };
  });
}

export function mapMasterDataAudit(
  id: string,
  audit: MasterDataAuditMeta | undefined,
  locale: Locale
): EntityAuditMeta {
  if (!audit) return { id };
  return {
    id,
    createdAt: formatDisplayDateTime(audit.createdAt, locale),
    updatedAt: formatDisplayDateTime(audit.updatedAt, locale),
    archivedAt: audit.archivedAt ? formatDisplayDateTime(audit.archivedAt, locale) : undefined,
    restoredAt: audit.restoredAt ? formatDisplayDateTime(audit.restoredAt, locale) : undefined,
    deactivatedAt: audit.deactivatedAt
      ? formatDisplayDateTime(audit.deactivatedAt, locale)
      : undefined,
    reactivatedAt: audit.reactivatedAt
      ? formatDisplayDateTime(audit.reactivatedAt, locale)
      : undefined,
    lifecycleActor: audit.lastActor ?? undefined,
  };
}

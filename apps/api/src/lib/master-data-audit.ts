import type { Prisma, PrismaClient } from "@prisma/client";
import type { MasterDataAuditMeta, MasterDataTimelineEvent } from "@ierp/shared";

type AuditDb = Prisma.TransactionClient | PrismaClient;

type EntityMetadata = {
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date | null;
  restoredAt?: Date | null;
  deactivatedAt?: Date | null;
  reactivatedAt?: Date | null;
};

export async function logMasterDataEvent(
  db: AuditDb,
  input: {
    organizationId: string;
    userId?: string | null;
    entity: string;
    entityId: string;
    action: string;
    summary: string;
    description?: string;
    fields?: string[];
  }
) {
  return db.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      action: `master_data.${input.entity.toLowerCase()}.${input.action}`,
      entity: input.entity,
      entityId: input.entityId,
      details: {
        summary: input.summary,
        ...(input.description ? { description: input.description } : {}),
        ...(input.fields?.length ? { fields: input.fields } : {}),
      },
    },
  });
}

function eventTitle(action: string, fallback: string): string {
  if (action.endsWith(".details_updated")) return "Details updated";
  if (action.endsWith(".notes_updated")) return "Notes updated";
  if (action.endsWith(".archived")) return "Record archived";
  if (action.endsWith(".restored")) return "Record restored";
  if (action.endsWith(".deactivated")) return "Record deactivated";
  if (action.endsWith(".reactivated")) return "Record reactivated";
  if (action.endsWith(".document_attached")) return "Document attached";
  if (action.endsWith(".document_unlinked")) return "Document unlinked";
  return fallback;
}

export async function getMasterDataLifecycle(
  db: AuditDb,
  input: {
    organizationId: string;
    entity: string;
    entityId: string;
    metadata: EntityMetadata;
    limit?: number;
  }
): Promise<{ audit: MasterDataAuditMeta; timeline: MasterDataTimelineEvent[] }> {
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 50);
  const logs = await db.auditLog.findMany({
    where: {
      organizationId: input.organizationId,
      entity: input.entity,
      entityId: input.entityId,
      action: { startsWith: "master_data." },
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.max(0, limit - 1),
  });

  const timeline: MasterDataTimelineEvent[] = logs.map((log) => {
    const details = (log.details ?? {}) as Record<string, unknown>;
    const summary =
      typeof details.summary === "string" ? details.summary : log.action.replaceAll(".", " ");
    return {
      id: log.id,
      action: log.action,
      title: eventTitle(log.action, summary),
      description:
        typeof details.description === "string"
          ? details.description
          : summary !== eventTitle(log.action, summary)
            ? summary
            : undefined,
      actor: log.user?.name,
      createdAt: log.createdAt.toISOString(),
    };
  });

  if (timeline.length < limit) {
    timeline.push({
      id: `${input.entity.toLowerCase()}-${input.entityId}-created`,
      action: `master_data.${input.entity.toLowerCase()}.created`,
      title: "Record created",
      createdAt: input.metadata.createdAt.toISOString(),
    });
  }

  return {
    audit: {
      createdAt: input.metadata.createdAt.toISOString(),
      updatedAt: input.metadata.updatedAt.toISOString(),
      archivedAt: input.metadata.archivedAt?.toISOString() ?? null,
      restoredAt: input.metadata.restoredAt?.toISOString() ?? null,
      deactivatedAt: input.metadata.deactivatedAt?.toISOString() ?? null,
      reactivatedAt: input.metadata.reactivatedAt?.toISOString() ?? null,
      lastActor: logs[0]?.user?.name ?? null,
    },
    timeline,
  };
}

export function changedFields<T extends Record<string, unknown>>(
  input: T,
  noteField = "notes"
): { profile: string[]; notesChanged: boolean } {
  const fields = Object.keys(input);
  return {
    profile: fields.filter((field) => field !== noteField),
    notesChanged: fields.includes(noteField),
  };
}

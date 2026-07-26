import {
  PRESENCE_HEARTBEAT_THROTTLE_MS,
  buildUserPresence,
  type UserPresence,
} from "@ierp/shared";
import { prisma } from "./prisma.js";

/** In-process throttle so multi-tab heartbeats do not thrash the DB. */
const lastWriteByUser = new Map<string, number>();

export type HeartbeatResult = {
  presence: UserPresence;
  serverTime: string;
  persisted: boolean;
};

/**
 * Record a presence heartbeat (or clear presence on offline).
 * Throttled writes; always returns derived presence from current DB state + this request.
 */
export async function applyPresenceHeartbeat(input: {
  userId: string;
  organizationId: string;
  active?: boolean;
  offline?: boolean;
}): Promise<HeartbeatResult | null> {
  const now = new Date();
  const serverTime = now.toISOString();

  if (input.offline) {
    const updated = await prisma.user.updateMany({
      where: { id: input.userId, organizationId: input.organizationId },
      data: {
        lastSeenAt: null,
        lastActiveAt: null,
        presenceUpdatedAt: now,
      },
    });
    if (updated.count === 0) return null;
    lastWriteByUser.delete(input.userId);
    return {
      presence: buildUserPresence(input.userId, { lastSeenAt: null, lastActiveAt: null }, now),
      serverTime,
      persisted: true,
    };
  }

  const existing = await prisma.user.findFirst({
    where: { id: input.userId, organizationId: input.organizationId },
    select: { id: true, lastSeenAt: true, lastActiveAt: true },
  });
  if (!existing) return null;

  const lastWrite = lastWriteByUser.get(input.userId) ?? 0;
  const withinThrottle = now.getTime() - lastWrite < PRESENCE_HEARTBEAT_THROTTLE_MS;
  const active = input.active !== false;

  // Always refresh lastSeenAt when outside throttle; refresh lastActiveAt only when active.
  // Inside throttle: skip DB write but still return derived presence with optimistic timestamps.
  if (withinThrottle) {
    const optimisticSeen = existing.lastSeenAt ?? now;
    const optimisticActive = active ? now : existing.lastActiveAt;
    return {
      presence: buildUserPresence(
        input.userId,
        { lastSeenAt: optimisticSeen, lastActiveAt: optimisticActive },
        now
      ),
      serverTime,
      persisted: false,
    };
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      lastSeenAt: now,
      ...(active ? { lastActiveAt: now } : {}),
      presenceUpdatedAt: now,
    },
    select: { id: true, lastSeenAt: true, lastActiveAt: true },
  });

  lastWriteByUser.set(input.userId, now.getTime());

  return {
    presence: buildUserPresence(
      updated.id,
      { lastSeenAt: updated.lastSeenAt, lastActiveAt: updated.lastActiveAt },
      now
    ),
    serverTime,
    persisted: true,
  };
}

export async function loadTenantPresence(input: {
  organizationId: string;
  userIds: string[];
}): Promise<UserPresence[]> {
  const unique = [...new Set(input.userIds.filter(Boolean))].slice(0, 50);
  if (unique.length === 0) return [];

  const now = new Date();
  const rows = await prisma.user.findMany({
    where: {
      organizationId: input.organizationId,
      id: { in: unique },
      isActive: true,
    },
    select: { id: true, lastSeenAt: true, lastActiveAt: true },
  });

  const byId = new Map(rows.map((r) => [r.id, r]));
  return unique.map((id) => {
    const row = byId.get(id);
    return buildUserPresence(
      id,
      {
        lastSeenAt: row?.lastSeenAt ?? null,
        lastActiveAt: row?.lastActiveAt ?? null,
      },
      now
    );
  });
}

/**
 * User presence derived from heartbeat timestamps (server time).
 * Online: recent activity heartbeat
 * Away: session heartbeats continue but user is idle
 * Offline: no heartbeats within the away window (or signed out)
 */
export type PresenceStatus = "online" | "away" | "offline";

/** Activity window — user is Online if lastActiveAt is within this age. */
export const PRESENCE_ONLINE_MS = 90_000;
/** Idle/session window — Away until lastSeenAt exceeds this; then Offline. */
export const PRESENCE_AWAY_MS = 10 * 60_000;
/** Client heartbeat interval while the tab is visible. */
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 45_000;
/** Minimum gap between persisted heartbeat writes (server throttle). */
export const PRESENCE_HEARTBEAT_THROTTLE_MS = 30_000;

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: string | null;
  lastActiveAt: string | null;
  /** Coarse, user-safe relative label key/hint — clients may localize. */
  label: string;
}

export function derivePresenceStatus(
  input: {
    lastSeenAt?: string | Date | null;
    lastActiveAt?: string | Date | null;
  },
  now: Date = new Date()
): PresenceStatus {
  const lastActive = toTime(input.lastActiveAt);
  const lastSeen = toTime(input.lastSeenAt);
  const nowMs = now.getTime();

  if (lastActive !== null && nowMs - lastActive <= PRESENCE_ONLINE_MS) {
    return "online";
  }
  if (lastSeen !== null && nowMs - lastSeen <= PRESENCE_AWAY_MS) {
    return "away";
  }
  return "offline";
}

export function buildUserPresence(
  userId: string,
  input: {
    lastSeenAt?: string | Date | null;
    lastActiveAt?: string | Date | null;
  },
  now: Date = new Date()
): UserPresence {
  const status = derivePresenceStatus(input, now);
  const lastSeenAt = toIso(input.lastSeenAt);
  const lastActiveAt = toIso(input.lastActiveAt);
  return {
    userId,
    status,
    lastSeenAt,
    lastActiveAt,
    label: presenceLabel(status, lastSeenAt, now),
  };
}

/** English fallback label — UI should prefer i18n keys. */
export function presenceLabel(
  status: PresenceStatus,
  lastSeenAt: string | null,
  now: Date = new Date()
): string {
  if (status === "online") return "Online";
  if (status === "away") return "Away";
  if (!lastSeenAt) return "Offline";
  const mins = Math.max(1, Math.round((now.getTime() - new Date(lastSeenAt).getTime()) / 60_000));
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `Last seen ${hours}h ago`;
  return "Offline";
}

function toTime(value?: string | Date | null): number | null {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function toIso(value?: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

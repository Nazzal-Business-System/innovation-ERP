import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRESENCE_AWAY_MS,
  PRESENCE_ONLINE_MS,
  derivePresenceStatus,
  presenceLabel,
} from "@ierp/shared";

describe("presence derivation", () => {
  const now = new Date("2026-07-25T12:00:00.000Z");

  it("marks Online when lastActiveAt is recent", () => {
    const lastActiveAt = new Date(now.getTime() - PRESENCE_ONLINE_MS + 5_000).toISOString();
    assert.equal(
      derivePresenceStatus({ lastActiveAt, lastSeenAt: lastActiveAt }, now),
      "online"
    );
  });

  it("marks Away when heartbeats continue but activity is stale", () => {
    const lastActiveAt = new Date(now.getTime() - PRESENCE_ONLINE_MS - 60_000).toISOString();
    const lastSeenAt = new Date(now.getTime() - 30_000).toISOString();
    assert.equal(derivePresenceStatus({ lastActiveAt, lastSeenAt }, now), "away");
  });

  it("marks Offline when lastSeenAt exceeds away window", () => {
    const lastSeenAt = new Date(now.getTime() - PRESENCE_AWAY_MS - 1_000).toISOString();
    assert.equal(derivePresenceStatus({ lastSeenAt, lastActiveAt: lastSeenAt }, now), "offline");
  });

  it("marks Offline when timestamps are null", () => {
    assert.equal(derivePresenceStatus({ lastSeenAt: null, lastActiveAt: null }, now), "offline");
  });

  it("formats coarse last-seen labels", () => {
    const lastSeenAt = new Date(now.getTime() - 12 * 60_000).toISOString();
    assert.equal(presenceLabel("offline", lastSeenAt, now), "Last seen 12m ago");
  });
});

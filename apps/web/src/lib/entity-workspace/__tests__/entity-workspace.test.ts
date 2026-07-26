import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_DETAILS_PAGE_LAYOUT,
  normalizeDetailsPageLayout,
} from "../layout.ts";
import { filterEntityActions, resolveEntityActions } from "../actions.ts";
import { resolveActionPendingLabel } from "../pending-label.ts";
import type { EntityAction } from "../types.ts";

describe("normalizeDetailsPageLayout", () => {
  it("returns workspace as default", () => {
    assert.equal(normalizeDetailsPageLayout(undefined), "workspace");
    assert.equal(normalizeDetailsPageLayout(null), "workspace");
    assert.equal(normalizeDetailsPageLayout(""), "workspace");
    assert.equal(DEFAULT_DETAILS_PAGE_LAYOUT, "workspace");
  });

  it("accepts valid layouts", () => {
    for (const layout of ["workspace", "executive", "compact", "focus"] as const) {
      assert.equal(normalizeDetailsPageLayout(layout), layout);
    }
  });

  it("falls back for invalid saved values", () => {
    assert.equal(normalizeDetailsPageLayout("classic"), "workspace");
    assert.equal(normalizeDetailsPageLayout(42), "workspace");
    assert.equal(normalizeDetailsPageLayout({ mode: "focus" }), "workspace");
  });
});

describe("resolveEntityActions", () => {
  const base: EntityAction[] = [
    { id: "edit", label: "Edit", kind: "primary", capability: "edit", onSelect: () => {} },
    { id: "print", label: "Print", kind: "secondary", capability: "print", onSelect: () => {} },
    { id: "export", label: "Export", kind: "secondary", capability: "export", onSelect: () => {} },
    { id: "approve", label: "Approve", kind: "secondary", capability: "approve", onSelect: () => {} },
    { id: "archive", label: "Archive", kind: "overflow", capability: "archive", onSelect: () => {} },
    {
      id: "delete",
      label: "Delete",
      kind: "destructive",
      capability: "delete",
      confirm: "hard",
      onSelect: () => {},
    },
    { id: "hidden", label: "Hidden", kind: "secondary", hidden: true, onSelect: () => {} },
  ];

  it("hides actions lacking capability", () => {
    const visible = filterEntityActions(base, ["read", "print"]);
    assert.deepEqual(
      visible.map((a) => a.id),
      ["print"]
    );
  });

  it("partitions primary secondary overflow and destructive", () => {
    const resolved = resolveEntityActions(base, {
      capabilities: ["edit", "print", "export", "approve", "archive", "delete"],
      maxVisibleSecondary: 2,
    });
    assert.equal(resolved.primary?.id, "edit");
    assert.deepEqual(
      resolved.secondary.map((a) => a.id),
      ["print", "export"]
    );
    assert.ok(resolved.overflow.some((a) => a.id === "approve"));
    assert.ok(resolved.overflow.some((a) => a.id === "archive"));
    assert.equal(resolved.destructive[0]?.id, "delete");
    assert.equal(resolved.destructive[0]?.confirm, "hard");
  });

  it("moves secondary into overflow on narrow viewports", () => {
    const resolved = resolveEntityActions(base, {
      capabilities: ["edit", "print", "export", "approve", "archive", "delete"],
      forceOverflow: true,
    });
    assert.equal(resolved.secondary.length, 0);
    assert.ok(resolved.overflow.some((a) => a.id === "print"));
    assert.equal(resolved.primary?.id, "edit");
  });

  it("ignores hidden actions", () => {
    const resolved = resolveEntityActions(base, {
      capabilities: ["edit", "print", "export", "approve", "archive", "delete"],
    });
    assert.equal(
      [...resolved.secondary, ...resolved.overflow].some((a) => a.id === "hidden"),
      false
    );
  });
});

describe("resolveActionPendingLabel", () => {
  const t = (key: string, fallback?: string) => fallback ?? key;

  it("prefers explicit pendingLabel", () => {
    assert.equal(
      resolveActionPendingLabel({ id: "archive", pendingLabel: "Custom…" }, t),
      "Custom…"
    );
  });

  it("maps archive/restore/lifecycle verbs", () => {
    assert.equal(resolveActionPendingLabel({ id: "archive" }, t), "Archiving…");
    assert.equal(resolveActionPendingLabel({ id: "restore" }, t), "Restoring…");
    assert.equal(resolveActionPendingLabel({ id: "deactivate" }, t), "Deactivating…");
    assert.equal(resolveActionPendingLabel({ id: "reactivate" }, t), "Reactivating…");
  });

  it("maps hyphenated transactional ids via first segment", () => {
    assert.equal(resolveActionPendingLabel({ id: "post-entry" }, t), "Posting…");
    assert.equal(resolveActionPendingLabel({ id: "send-invoice" }, t), "Sending…");
    assert.equal(resolveActionPendingLabel({ id: "receive-bill" }, t), "Receiving…");
    assert.equal(resolveActionPendingLabel({ id: "confirm-delivery" }, t), "Confirming…");
  });

  it("maps approve reject process publish delete complete cancel pay", () => {
    assert.equal(resolveActionPendingLabel({ id: "approve" }, t), "Approving…");
    assert.equal(resolveActionPendingLabel({ id: "reject" }, t), "Rejecting…");
    assert.equal(resolveActionPendingLabel({ id: "process" }, t), "Processing…");
    assert.equal(resolveActionPendingLabel({ id: "publish" }, t), "Publishing…");
    assert.equal(resolveActionPendingLabel({ id: "delete" }, t), "Deleting…");
    assert.equal(resolveActionPendingLabel({ id: "complete" }, t), "Completing…");
    assert.equal(resolveActionPendingLabel({ id: "cancel" }, t), "Cancelling…");
    assert.equal(resolveActionPendingLabel({ id: "pay" }, t), "Paying…");
  });

  it("falls back to Saving… for unknown actions", () => {
    assert.equal(resolveActionPendingLabel({ id: "mystery" }, t), "Saving…");
    assert.equal(resolveActionPendingLabel(null, t), "Saving…");
  });
});

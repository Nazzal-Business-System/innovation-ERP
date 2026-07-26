import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Mirrors sidebar-pins-store reindex — array position is authoritative.
 * Regression: sorting by stale `order` before reindex undoes drag reorder.
 */
function reindex(pins: Array<{ id: string; order: number }>) {
  return pins.map((p, order) => ({ ...p, order }));
}

function sortPins(pins: Array<{ id: string; order: number }>) {
  return [...pins].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

describe("sidebar pin reorder", () => {
  it("reindex preserves array order even when order fields are stale", () => {
    const dragged = [
      { id: "notifications", order: 1 },
      { id: "dashboard", order: 0 },
    ];
    assert.deepEqual(reindex(dragged), [
      { id: "notifications", order: 0 },
      { id: "dashboard", order: 1 },
    ]);
  });

  it("legacy sort-then-reindex would incorrectly undo the drag (documenting the bug)", () => {
    const dragged = [
      { id: "notifications", order: 1 },
      { id: "dashboard", order: 0 },
    ];
    const buggy = sortPins(dragged).map((p, order) => ({ ...p, order }));
    assert.deepEqual(buggy, [
      { id: "dashboard", order: 0 },
      { id: "notifications", order: 1 },
    ]);
  });
});

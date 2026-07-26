import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isKnownNavItemId, getNavItemById } from "@ierp/shared";

describe("nav pin ids", () => {
  it("recognizes known NAV_GROUPS item ids", () => {
    assert.equal(isKnownNavItemId("accounting-journal"), true);
    assert.equal(isKnownNavItemId("sales-customers"), true);
    assert.equal(isKnownNavItemId("crm-opportunities"), true);
    assert.equal(isKnownNavItemId("reports-overview"), true);
    assert.equal(isKnownNavItemId("not-a-real-item"), false);
  });

  it("resolves stable hrefs for pinnable destinations", () => {
    assert.equal(getNavItemById("knowledge-articles")?.href, "/dashboard/knowledge/articles");
    assert.equal(getNavItemById("accounting-trial-balance")?.href, "/dashboard/accounting/trial-balance");
  });
});

describe("sidebar pin normalize (client-shaped)", () => {
  it("dedupes and reindexes pin order", () => {
    const pins = [
      { id: "sales-customers", order: 2 },
      { id: "sales-customers", order: 0 },
      { id: "crm-opportunities", order: 1 },
    ];
    const seen = new Set<string>();
    const out: Array<{ id: string; order: number }> = [];
    for (const pin of [...pins].sort((a, b) => a.order - b.order)) {
      if (!isKnownNavItemId(pin.id) || seen.has(pin.id)) continue;
      seen.add(pin.id);
      out.push({ id: pin.id, order: out.length });
    }
    assert.deepEqual(out, [
      { id: "sales-customers", order: 0 },
      { id: "crm-opportunities", order: 1 },
    ]);
  });
});

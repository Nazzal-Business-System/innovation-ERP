import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  looksLikeRecordCode,
  scoreSearchFields,
  groupSearchResults,
} from "../../utils/search-ranking.ts";

describe("scoreSearchFields", () => {
  it("ranks exact code above title contains", () => {
    const exactCode = scoreSearchFields("PO-2026", [
      { field: "poNumber", value: "PO-2026-001", kind: "code" },
      { field: "vendor", value: "Acme", kind: "related" },
    ]);
    const titleOnly = scoreSearchFields("PO-2026", [
      { field: "name", value: "Notes about PO-2026 somewhere", kind: "body" },
    ]);
    assert.ok(exactCode.score > titleOnly.score);
    assert.equal(exactCode.matchedField, "poNumber");
  });

  it("ranks exact title highly", () => {
    const r = scoreSearchFields("Bottled Water", [
      { field: "name", value: "Bottled Water", kind: "title" },
      { field: "sku", value: "BEV-001", kind: "code" },
    ]);
    assert.ok(r.score >= 100);
    assert.equal(r.matchedField, "name");
  });

  it("supports partial token matches", () => {
    const r = scoreSearchFields("approv", [
      { field: "title", value: "Approval workflow guide", kind: "title" },
    ]);
    assert.ok(r.score > 0);
  });

  it("returns 0 when nothing matches", () => {
    const r = scoreSearchFields("zzzz", [
      { field: "name", value: "Bottled Water", kind: "title" },
    ]);
    assert.equal(r.score, 0);
  });
});

describe("looksLikeRecordCode", () => {
  it("detects document-style codes", () => {
    assert.equal(looksLikeRecordCode("SO-2026"), true);
    assert.equal(looksLikeRecordCode("PO-2026-01"), true);
    assert.equal(looksLikeRecordCode("INV-100"), true);
    assert.equal(looksLikeRecordCode("FMCG"), false);
    assert.equal(looksLikeRecordCode("payroll"), false);
  });
});

describe("groupSearchResults", () => {
  it("orders modules and sorts by score within group", () => {
    const grouped = groupSearchResults(
      [
        { module: "SALES", score: 10, id: "a" },
        { module: "NAVIGATION", score: 50, id: "n" },
        { module: "SALES", score: 90, id: "b" },
      ],
      { NAVIGATION: "Navigation", SALES: "Sales" },
      ["NAVIGATION", "SALES"]
    );
    assert.equal(grouped[0].module, "NAVIGATION");
    assert.equal(grouped[1].results[0].id, "b");
  });
});

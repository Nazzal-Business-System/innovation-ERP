import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  availableQuantity,
  documentExpiryBucket,
  inventoryValuationFromRows,
  isSupportTicketOverdue,
  journalDebitsEqualCredits,
  percentChange,
  payrollRunEqualsLineSum,
  roundMoney,
} from "../metric-math.ts";
import { isRevenueAccountLine } from "../serialize-accounting.ts";

describe("percentChange", () => {
  it("computes (current - previous) / abs(previous) × 100", () => {
    const r = percentChange(120, 100);
    assert.equal(r.changePercent, 20);
    assert.equal(r.trend, "up");
    assert.match(r.comparison, /\+20\.0%/);
  });

  it("handles negative previous baseline with abs", () => {
    const r = percentChange(-50, -100);
    assert.equal(r.changePercent, 50);
    assert.equal(r.trend, "up");
  });

  it("never returns Infinity when previous is 0", () => {
    const withValue = percentChange(10, 0);
    assert.equal(withValue.changePercent, undefined);
    assert.equal(withValue.comparison, "New");

    const bothZero = percentChange(0, 0);
    assert.equal(bothZero.comparison, "No comparison data");
    assert.equal(bothZero.trend, "neutral");
  });
});

describe("isRevenueAccountLine", () => {
  it("includes REVENUE type and canonical code 4000", () => {
    assert.equal(isRevenueAccountLine({ code: "4000", type: "REVENUE" }), true);
    assert.equal(isRevenueAccountLine({ code: "4010", type: "REVENUE" }), true);
    assert.equal(isRevenueAccountLine({ code: "4000", type: "ASSET" }), true);
    assert.equal(isRevenueAccountLine({ code: "1100", type: "ASSET" }), false);
    assert.equal(isRevenueAccountLine({ code: "6100", type: "EXPENSE" }), false);
  });
});

describe("inventoryValuationFromRows", () => {
  it("equals sum(qty × cost) rounded to 2 decimals", () => {
    const value = inventoryValuationFromRows([
      { quantityOnHand: 10, unitCost: 12.345 },
      { quantityOnHand: 3, unitCost: 2.5 },
    ]);
    assert.equal(value, roundMoney(10 * 12.345 + 3 * 2.5));
  });
});

describe("availableQuantity", () => {
  it("is onHand − reserved", () => {
    assert.equal(availableQuantity(100, 25), 75);
    assert.equal(availableQuantity(10, 10), 0);
  });
});

describe("journalDebitsEqualCredits", () => {
  it("reconciles balanced lines", () => {
    const r = journalDebitsEqualCredits([
      { debit: 100.5, credit: 0 },
      { debit: 0, credit: 50.25 },
      { debit: 0, credit: 50.25 },
    ]);
    assert.equal(r.balanced, true);
    assert.equal(r.totalDebit, 100.5);
    assert.equal(r.totalCredit, 100.5);
  });

  it("detects imbalance", () => {
    const r = journalDebitsEqualCredits([
      { debit: 100, credit: 0 },
      { debit: 0, credit: 99.5 },
    ]);
    assert.equal(r.balanced, false);
  });
});

describe("payrollRunEqualsLineSum", () => {
  it("matches run net to sum of lines", () => {
    assert.equal(payrollRunEqualsLineSum(1507.5, [500.25, 1007.25]), true);
    assert.equal(payrollRunEqualsLineSum(100, [40, 50]), false);
  });
});

describe("isSupportTicketOverdue", () => {
  const now = new Date("2026-07-22T12:00:00");
  it("flags open tickets past due", () => {
    assert.equal(isSupportTicketOverdue("OPEN", new Date("2026-07-20"), now), true);
    assert.equal(isSupportTicketOverdue("IN_PROGRESS", new Date("2026-07-23"), now), false);
    assert.equal(isSupportTicketOverdue("RESOLVED", new Date("2026-07-01"), now), false);
    assert.equal(isSupportTicketOverdue("OPEN", null, now), false);
  });
});

describe("documentExpiryBucket", () => {
  const now = new Date("2026-07-22T12:00:00");
  it("uses mutually exclusive buckets", () => {
    assert.equal(documentExpiryBucket(new Date("2026-07-01"), now), "expired");
    assert.equal(documentExpiryBucket(new Date("2026-08-01"), now), "expiring");
    assert.equal(documentExpiryBucket(new Date("2026-12-01"), now), "active");
    assert.equal(documentExpiryBucket(null, now), "none");
  });
});

describe("open order status contracts", () => {
  it("documents expected open SO / PO sets", () => {
    const OPEN_SO = ["CONFIRMED", "PICKING", "READY_TO_SHIP"];
    const OPEN_PO = ["SENT", "APPROVED", "PARTIALLY_RECEIVED"];
    assert.ok(!OPEN_SO.includes("DRAFT"));
    assert.ok(!OPEN_PO.includes("DRAFT"));
    assert.ok(!OPEN_SO.includes("CANCELLED"));
    assert.ok(!OPEN_PO.includes("CANCELLED"));
  });
});

describe("net profit formula", () => {
  it("is revenue minus expenses for same period", () => {
    const revenue = 10000.55;
    const expenses = 2500.1;
    assert.equal(roundMoney(revenue - expenses), 7500.45);
  });
});

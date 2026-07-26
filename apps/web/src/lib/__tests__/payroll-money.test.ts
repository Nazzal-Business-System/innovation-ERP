import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatJodAmount,
  parseMoneyAmount,
  sumMoneyAmounts,
  toCanonicalMoneyString,
} from "@ierp/shared";
import {
  formatPayrollMoney,
  hasValidPayrollNetPay,
  requirePayrollNetTotal,
  sumPayrollNetPay,
} from "../hr/payroll-money.ts";

describe("parseMoneyAmount", () => {
  it("parses numeric values", () => {
    assert.deepEqual(parseMoneyAmount(1507.5), { ok: true, value: 1507.5 });
    assert.deepEqual(parseMoneyAmount(0), { ok: true, value: 0 });
  });

  it("parses canonical decimal strings", () => {
    assert.deepEqual(parseMoneyAmount("1507.50"), { ok: true, value: 1507.5 });
    assert.deepEqual(parseMoneyAmount("0.00"), { ok: true, value: 0 });
  });

  it("parses Prisma-style decimal serialization via toString", () => {
    const decimalLike = { toString: () => "18500.25" };
    assert.deepEqual(parseMoneyAmount(decimalLike), { ok: true, value: 18500.25 });
  });

  it("parses legacy formatted JOD strings", () => {
    assert.deepEqual(parseMoneyAmount("JOD 1,507.50"), { ok: true, value: 1507.5 });
    assert.deepEqual(parseMoneyAmount("JOD 74,430.17"), { ok: true, value: 74430.17 });
  });

  it("rejects invalid values without coercing to zero", () => {
    assert.deepEqual(parseMoneyAmount(null), { ok: false, reason: "missing" });
    assert.deepEqual(parseMoneyAmount(""), { ok: false, reason: "missing" });
    assert.deepEqual(parseMoneyAmount("NaN"), { ok: false, reason: "invalid" });
    assert.deepEqual(parseMoneyAmount("abc"), { ok: false, reason: "invalid" });
    assert.deepEqual(parseMoneyAmount(Number.NaN), { ok: false, reason: "invalid" });
  });
});

describe("sumMoneyAmounts / payroll totals", () => {
  it("sums many selected line amounts in cents", () => {
    const canonical = Array.from({ length: 51 }, () => "1459.42");
    const result = sumMoneyAmounts(canonical);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.count, 51);
      assert.equal(result.total, 74430.42);
      assert.equal(formatJodAmount(result.total), "JOD 74,430.42");
    }
  });

  it("fails explicitly on invalid entry", () => {
    const result = sumMoneyAmounts(["100.00", "JOD 1,507.50", "bad"]);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.invalidIndex, 2);
    }
  });

  it("supports select-all-filtered style aggregation across pages", () => {
    const page1 = ["100.00", "200.50", "300.25"];
    const page2 = ["400.00", "500.75"];
    const all = [...page1, ...page2];
    const result = sumPayrollNetPay(all);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.total, 1501.5);
      assert.equal(formatJodAmount(result.total), "JOD 1,501.50");
    }
  });
});

describe("formatJodAmount / payroll display", () => {
  it("formats with JOD prefix and grouping", () => {
    assert.equal(formatJodAmount(74430.17), "JOD 74,430.17");
    assert.equal(toCanonicalMoneyString(74430.17), "74430.17");
    assert.equal(formatPayrollMoney("74430.17"), "JOD 74,430.17");
    assert.equal(formatPayrollMoney("JOD 1,507.50"), "JOD 1,507.50");
  });

  it("marks zero as valid amount but not payable net pay", () => {
    assert.equal(parseMoneyAmount("0.00").ok, true);
    assert.equal(hasValidPayrollNetPay("0.00"), false);
    assert.equal(hasValidPayrollNetPay("10.00"), true);
  });

  it("requirePayrollNetTotal returns formatted total", () => {
    const ok = requirePayrollNetTotal(["1000.00", "507.50"]);
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.total, 1507.5);
      assert.equal(ok.formatted, "JOD 1,507.50");
    }
    const bad = requirePayrollNetTotal(["1000.00", "nope"]);
    assert.equal(bad.ok, false);
  });
});
